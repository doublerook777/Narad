import { TinyFish, type SearchResult } from "@tiny-fish/sdk";

let client: TinyFish | null = null;

export function getTinyFishClient(): TinyFish {
  if (!client) {
    const apiKey = process.env.TINYFISH_API_KEY || "";
    client = new TinyFish({ apiKey });
  }
  return client;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export interface SearchOptions {
  include_domains?: string;
  exclude_domains?: string;
  recency_minutes?: number;
  after_date?: string;
  before_date?: string;
  location?: string;
  language?: string;
  purpose?: string;
}

export async function search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.warn("[tinyfish] TINYFISH_API_KEY not set, search returning []");
    return [];
  }

  try {
    const tf = getTinyFishClient();
    const task = tf.search.query({
      query,
      location: options?.location ?? "US",
      language: options?.language ?? "en",
      include_domains: options?.include_domains,
      exclude_domains: options?.exclude_domains,
      recency_minutes: options?.recency_minutes,
      after_date: options?.after_date,
      before_date: options?.before_date,
      purpose: options?.purpose,
    });

    // 10s timeout as specified in plan.md A1.1
    const res = await withTimeout(task, 10_000, null);
    if (!res || !Array.isArray(res.results)) return [];
    return res.results;
  } catch (err) {
    console.warn("[tinyfish] search failed:", (err as Error)?.message || err);
    return [];
  }
}

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  status: "ok" | "error";
}

export async function fetchPages(urls: string[], purpose?: string): Promise<FetchedPage[]> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey || !urls || urls.length === 0) {
    if (!apiKey) console.warn("[tinyfish] TINYFISH_API_KEY not set, fetchPages returning []");
    return [];
  }

  try {
    const tf = getTinyFishClient();
    const targetUrls = urls.slice(0, 10);
    const task = tf.fetch.getContents({
      urls: targetUrls,
      purpose,
      format: "markdown",
      per_url_timeout_ms: 25_000,
    });

    // 30s timeout as specified in plan.md A1.1
    const res = await withTimeout(task, 30_000, null);
    if (!res || !Array.isArray(res.results)) return [];

    return res.results.map((r: any) => ({
      url: r.url || "",
      title: r.title || "",
      text: r.text || "",
      status: "ok" as const,
    }));
  } catch (err) {
    console.warn("[tinyfish] fetchPages failed:", (err as Error)?.message || err);
    return [];
  }
}

export type { SearchResult };
