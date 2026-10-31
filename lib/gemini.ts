import { GoogleGenAI } from "@google/genai";
import { getCache, setCache } from "./cache";

let aiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

// Concurrency limit to prevent overwhelming Gemini per-minute free-tier quotas
const geminiSemaphore = new Semaphore(2);

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err);
  const status = err.status || err.statusCode || err.code;
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate limit") ||
    msg.includes("Quota exceeded")
  );
}

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

export async function json<T>(
  prompt: string,
  schema?: any,
  options?: {
    systemInstruction?: string;
    model?: string;
    cacheKind?: string;
    cacheKey?: string;
  }
): Promise<T> {
  const cacheKey = options?.cacheKey || prompt;
  const cacheKind = options?.cacheKind || "gemini";

  // Check disk cache first
  const cached = await getCache<T>(cacheKind, cacheKey);
  if (cached !== null) {
    return cached;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[gemini] GEMINI_API_KEY is not configured");
  }

  const model = options?.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const client = getClient();

  const maxRetries = 3;
  let delayMs = 1500;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await geminiSemaphore.acquire();
    try {
      const config: any = {
        responseMimeType: "application/json",
      };
      if (schema) {
        config.responseSchema = schema;
      }
      if (options?.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const text = response.text || "{}";
      const cleaned = cleanJsonString(text);
      const parsed = JSON.parse(cleaned) as T;

      // Save to disk cache
      await setCache<T>(cacheKind, cacheKey, parsed);
      return parsed;
    } catch (err: any) {
      const is429 = isRateLimitError(err);
      if (is429 && attempt < maxRetries) {
        console.warn(`[gemini] 429 rate limit hit, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
        continue;
      }
      throw err;
    } finally {
      geminiSemaphore.release();
    }
  }

  throw new Error("[gemini] Failed after max retries");
}
