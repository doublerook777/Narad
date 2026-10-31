import { json } from "../gemini";

export interface ExtractedClaimItem {
  text: string;
  kind: "factual" | "opinion";
}

interface ExtractionResponse {
  claims: ExtractedClaimItem[];
}

const extractionSchema = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      description: "List of at most 4 key distinct claims made in the debate argument",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "A single distinct claim, stated clearly and concisely",
          },
          kind: {
            type: "string",
            enum: ["factual", "opinion"],
            description:
              "'factual' for empirical, historical, scientific, or statistical claims; 'opinion' for subjective value judgments or personal beliefs",
          },
        },
        required: ["text", "kind"],
      },
    },
  },
  required: ["claims"],
};

export async function extractClaims(argument: string, topic?: string): Promise<ExtractedClaimItem[]> {
  const trimmed = argument.trim();
  if (!trimmed) return [];

  const prompt = `You are a strict, objective fact-checking parser for a 1v1 debate game.
Topic under debate: "${topic || "General Discussion"}"

Debater's argument:
"""
${trimmed}
"""

Task:
Break this argument into up to 4 key distinct claims.
- Classify each claim as either:
  * "factual": Any measurable, empirical, scientific, economic, or historical assertion that can be substantiated or disproved with data.
  * "opinion": Subjective judgments, moral preferences, personal views, or non-verifiable hyperbole.
- Maximum 4 claims total.
- Keep each claim succinct and self-contained.`;

  try {
    const res = await json<ExtractionResponse>(prompt, extractionSchema, {
      systemInstruction: "You extract claims from debate text and classify them as factual or opinion in JSON format.",
      cacheKind: "extract",
      cacheKey: `${topic || ""}:${trimmed}`,
    });

    if (res && Array.isArray(res.claims) && res.claims.length > 0) {
      return res.claims.slice(0, 4).map((c) => ({
        text: String(c.text || "").trim(),
        kind: c.kind === "opinion" ? "opinion" : "factual",
      }));
    }
  } catch (err) {
    console.warn("[extract] extraction failed, falling back to raw argument:", err);
  }

  // Graceful degradation fallback
  return [
    {
      text: trimmed.slice(0, 300),
      kind: "factual",
    },
  ];
}
