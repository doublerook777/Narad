import { search, fetchPages, type SearchResult, type FetchedPage } from "../tinyfish";
import { json } from "../gemini";
import { getDomainTier, extractDomain, getTier1SearchDomains } from "../sources";
import type { Verdict, Evidence } from "../types";

export interface VerificationResult {
  verdict: Verdict;
  confidence: number;
  relevance: number;
  explanation: string;
  evidence: Evidence[];
  citedUrlCheck?: "matches" | "misrepresented" | "unreadable";
}

interface GeminiVerdictResponse {
  verdict: "supported" | "refuted" | "misleading" | "unverifiable";
  confidence: number;
  relevance: number;
  explanation: string;
  evidence: Array<{
    url: string;
    quote: string;
  }>;
  citedUrlCheck?: "matches" | "misrepresented" | "unreadable";
}

const verdictSchema = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["supported", "refuted", "misleading", "unverifiable"],
      description:
        "'supported' if credible evidence backs it, 'refuted' if evidence disproves it, 'misleading' if half-true/deceptive, 'unverifiable' if insufficient/conflicting evidence",
    },
    confidence: {
      type: "number",
      description: "Confidence in the verdict from 0.0 to 1.0",
    },
    relevance: {
      type: "number",
      description: "Relevance of the claim to the topic from 0.5 to 1.0",
    },
    explanation: {
      type: "string",
      description: "One crisp, direct sentence explaining the verdict for display on a card",
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          quote: {
            type: "string",
            description: "An exact or verbatim excerpt from the source text supporting the verdict",
          },
        },
        required: ["url", "quote"],
      },
    },
    citedUrlCheck: {
      type: "string",
      enum: ["matches", "misrepresented", "unreadable"],
      description:
        "Assessment of the user's cited URL: 'matches' if source backs their claim, 'misrepresented' if they cited it dishonestly, 'unreadable' if not accessible",
    },
  },
  required: ["verdict", "confidence", "relevance", "explanation", "evidence"],
};

export async function verifyClaim(
  claimText: string,
  topic: string,
  citedUrl?: string,
  onStage?: (stage: "searching" | "fetching" | "judging") => void
): Promise<VerificationResult> {
  const fallbackResult: VerificationResult = {
    verdict: "unverifiable",
    confidence: 0,
    relevance: 0.5,
    explanation: "No conclusive evidence found to verify this statement.",
    evidence: [],
    citedUrlCheck: citedUrl ? "unreadable" : undefined,
  };

  try {
    onStage?.("searching");

    // 1. Search Tier 1 credible domains first
    const tier1Domains = getTier1SearchDomains();
    let searchResults: SearchResult[] = await search(claimText, {
      include_domains: tier1Domains,
      purpose: `Fact-check claim: ${claimText}`,
    });

    // Fallback to unrestricted search if < 2 results
    if (searchResults.length < 2) {
      const unrestricted = await search(claimText, {
        purpose: `Fact-check claim: ${claimText}`,
      });
      // Merge and deduplicate
      const seen = new Set(searchResults.map((r) => r.url));
      for (const r of unrestricted) {
        if (!seen.has(r.url)) {
          searchResults.push(r);
          seen.add(r.url);
        }
      }
    }

    // Pick top 2-3 URLs
    const urlsToFetch: string[] = searchResults.slice(0, 3).map((r) => r.url);

    // If citedUrl is given and valid, include it
    if (citedUrl && citedUrl.startsWith("http") && !urlsToFetch.includes(citedUrl)) {
      urlsToFetch.unshift(citedUrl);
    }

    if (urlsToFetch.length === 0) {
      return fallbackResult;
    }

    // 2. Fetch pages
    onStage?.("fetching");
    const fetchedPages: FetchedPage[] = await fetchPages(
      urlsToFetch,
      `Evaluate factual statement: "${claimText}"`
    );

    const validPages = fetchedPages.filter((p) => p.text && p.text.trim().length > 30);
    if (validPages.length === 0) {
      return fallbackResult;
    }

    // 3. Judge verdict with Gemini
    onStage?.("judging");
    const pageExcerpts = validPages
      .map((p, idx) => {
        const snippet = p.text.slice(0, 1500).replace(/\s+/g, " ");
        return `[Source ${idx + 1}] (${p.url}) Title: "${p.title}"\nContent: "${snippet}"`;
      })
      .join("\n\n");

    const prompt = `You are an impartial fact-checking referee for a debate on: "${topic}".
Factual Claim to evaluate:
"""
${claimText}
"""
${citedUrl ? `Debater's Cited URL: ${citedUrl}\n` : ""}
Evidence Sources fetched from web:
${pageExcerpts}

Instructions:
1. Compare the claim strictly against the provided source texts.
2. Assign a verdict:
   - "supported": The factual assertion is clearly corroborated by the sources.
   - "refuted": The source text explicitly contradicts or disproves the assertion.
   - "misleading": The claim cherry-picks facts, is technically true in part but omits essential context, or misinterprets data.
   - "unverifiable": The provided sources do not contain enough relevant information to settle the truth of the claim.
3. Extract accurate verbatim quotes from the sources as evidence.
4. If a cited URL was provided, verify whether it matches the claim, was misrepresented, or was unreadable.
5. Provide a crisp 1-sentence explanation suitable for display on a game card.`;

    const res = await json<GeminiVerdictResponse>(prompt, verdictSchema, {
      systemInstruction: "You are a professional fact-checker outputting strictly structured JSON verdicts.",
      cacheKind: "verify",
      cacheKey: `${topic}:${claimText}:${citedUrl || ""}`,
    });

    if (res && res.verdict) {
      const evidenceList: Evidence[] = (res.evidence || []).map((e) => {
        const matchingPage = validPages.find((p) => p.url === e.url);
        const domain = extractDomain(e.url);
        return {
          url: e.url,
          title: matchingPage?.title || domain,
          domain,
          quote: e.quote || "",
          tier: getDomainTier(e.url),
        };
      });

      return {
        verdict: res.verdict,
        confidence: Math.max(0, Math.min(1, Number(res.confidence) || 0.8)),
        relevance: Math.max(0.5, Math.min(1, Number(res.relevance) || 0.9)),
        explanation: res.explanation || "Verdict verified with web sources.",
        evidence: evidenceList,
        citedUrlCheck: citedUrl ? res.citedUrlCheck || "matches" : undefined,
      };
    }
  } catch (err) {
    console.warn("[verify] verification failed:", (err as Error)?.message || err);
  }

  return fallbackResult;
}
