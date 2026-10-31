import { getTinyFishClient } from "./tinyfish";
import { json } from "./gemini";
import type { TrendingTopic } from "./lobby-types";

// "Hot right now" topic ideas: fresh news via TinyFish Search (free), turned into debatable statements by Gemini.

const TTL_MS = 30 * 60_000;
const QUERIES: [string, string][] = [
  ["Tech", "artificial intelligence technology news"],
  ["Energy", "energy climate nuclear solar news"],
  ["Economy", "economy jobs inflation housing news"],
  ["Health", "health science medicine study news"],
  ["Society", "social media education policy debate news"],
];

// Shown if there is no key, no network, or Gemini is having a bad day. Always debatable with facts.
const FALLBACK: TrendingTopic[] = [
  { statement: "Nuclear power is safer than fossil fuels", blurb: "Energy security and climate goals keep reviving the nuclear debate.", tag: "Energy" },
  { statement: "AI will create more jobs than it destroys", blurb: "Companies keep announcing AI-driven restructuring.", tag: "Tech" },
  { statement: "Remote work is better for productivity than the office", blurb: "Return-to-office mandates are back in the headlines.", tag: "Economy" },
  { statement: "Social media has done more harm than good", blurb: "Governments are weighing age limits and new regulation.", tag: "Society" },
  { statement: "Electric cars are cleaner than petrol cars over their lifetime", blurb: "EV sales and incentives are changing fast.", tag: "Energy" },
  { statement: "Sugar taxes reduce obesity", blurb: "More countries are copying soft-drink levies.", tag: "Health" },
];

const g = globalThis as unknown as { __naradTopics?: { at: number; topics: TrendingTopic[]; live: boolean }; __naradTopicsPending?: Promise<void> };

const domainOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };

async function build(): Promise<{ topics: TrendingTopic[]; live: boolean }> {
  if (!process.env.TINYFISH_API_KEY || !process.env.GEMINI_API_KEY) return { topics: FALLBACK, live: false };
  try {
    const tf = getTinyFishClient();
    const batches = await Promise.all(
      QUERIES.map(async ([tag, query]) => {
        try {
          const res = await Promise.race([
            tf.search.query({ query, domain_type: "news", recency_minutes: 2880, location: "US", language: "en" }),
            new Promise<null>((r) => setTimeout(() => r(null), 10_000)),
          ]);
          return (res?.results ?? []).slice(0, 4).map((r) => ({ tag, title: r.title, url: r.url, snippet: r.snippet }));
        } catch { return []; }
      }),
    );
    const seenUrls = new Set<string>();
    const headlines = batches.flat().filter((h) => h.title && !seenUrls.has(h.url) && seenUrls.add(h.url));
    if (headlines.length < 5) return { topics: FALLBACK, live: false };

    const list = headlines.map((h, i) => `${i}. [${h.tag}] ${h.title} - ${h.snippet?.slice(0, 140) ?? ""}`).join("\n");
    const out = await json<{ topics: { statement: string; blurb: string; tag: string; headline: number }[] }>(
      `Here are headlines from the last two days:\n${list}\n\nPick the 6 most debate-worthy and turn each into a debate motion.\n` +
        `Rules: one clear declarative statement (max 14 words) that two people could argue FOR or AGAINST using verifiable facts and statistics ` +
        `(not pure opinion, not a question), neutral wording, no names of private individuals. "blurb" = one short sentence on why it is in the news. ` +
        `"headline" = the index of the headline it came from. "tag" = a one-word category. Cover different categories.`,
      {
        type: "object",
        properties: {
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                statement: { type: "string" }, blurb: { type: "string" }, tag: { type: "string" }, headline: { type: "integer" },
              },
              required: ["statement", "blurb", "tag", "headline"],
            },
          },
        },
        required: ["topics"],
      },
      { cacheKind: "trending", cacheKey: list },
    );
    const topics: TrendingTopic[] = (out.topics ?? [])
      .filter((t) => t.statement && t.statement.length < 140)
      .slice(0, 6)
      .map((t) => {
        const h = headlines[t.headline];
        return {
          statement: t.statement.trim().replace(/[.]+$/, ""),
          blurb: String(t.blurb ?? "").trim(),
          tag: String(t.tag ?? "News").trim().slice(0, 14),
          source: h ? { title: h.title, url: h.url, domain: domainOf(h.url) } : undefined,
        };
      });
    return topics.length >= 3 ? { topics, live: true } : { topics: FALLBACK, live: false };
  } catch (err) {
    console.warn("[trending] falling back to the built-in list:", (err as Error)?.message || err);
    return { topics: FALLBACK, live: false };
  }
}

/** Cached for 30 minutes; concurrent callers share one refresh. Never throws. */
export async function getTrendingTopics(): Promise<{ topics: TrendingTopic[]; live: boolean; at: number }> {
  const hit = g.__naradTopics;
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  if (!g.__naradTopicsPending) {
    g.__naradTopicsPending = build()
      .then((r) => { g.__naradTopics = { at: r.live ? Date.now() : Date.now() - TTL_MS + 2 * 60_000, ...r }; }) // retry a failed refresh after 2 min
      .finally(() => { g.__naradTopicsPending = undefined; });
  }
  await g.__naradTopicsPending;
  return g.__naradTopics!;
}
