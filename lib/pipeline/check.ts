import { nanoid } from "nanoid";
import { extractClaims } from "./extract";
import { verifyClaim } from "./verify";
import { captureReceipt } from "./receipt";
import type { CheckInput, Claim } from "../types";

export async function checkTurn(input: CheckInput, emit: (c: Claim) => void): Promise<Claim[]> {
  const { topic, turn } = input;

  // 1. Extract claims from the turn text
  const extractedList = await extractClaims(turn.text, topic);

  // 2. Initialize claims
  const claims: Claim[] = extractedList.map((extracted) => {
    const claim: Claim = {
      id: nanoid(),
      turnId: turn.id,
      player: turn.player,
      text: extracted.text,
      kind: extracted.kind,
      status: "queued",
      verdict: "pending",
      confidence: 0,
      relevance: 1,
      explanation: "",
      evidence: [],
      citedUrl: turn.citedUrl,
      points: 0,
    };
    emit(claim);
    return claim;
  });

  // 3. Process claims in parallel
  await Promise.all(
    claims.map(async (claim) => {
      // Opinions are tagged, not fact-checked
      if (claim.kind === "opinion") {
        claim.status = "done";
        claim.verdict = "opinion";
        claim.confidence = 1;
        claim.relevance = 0.5;
        claim.explanation = "Opinion / subjective statement (not fact-checked).";
        emit(claim);
        return;
      }

      // Factual claims: progress through searching -> fetching -> judging -> done
      try {
        const result = await verifyClaim(
          claim.text,
          topic,
          claim.citedUrl,
          (stage) => {
            claim.status = stage;
            emit(claim);
          }
        );

        claim.verdict = result.verdict;
        claim.confidence = result.confidence;
        claim.relevance = result.relevance;
        claim.explanation = result.explanation;
        claim.evidence = result.evidence;
        claim.citedUrlCheck = result.citedUrlCheck;

        // Phase 2: If supported or refuted, capture receipt screenshot
        const isSupportedOrRefuted = claim.verdict === "supported" || claim.verdict === "refuted";
        const primaryEvidence = claim.evidence?.[0];

        if (isSupportedOrRefuted && primaryEvidence?.url) {
          claim.status = "receipt";
          emit(claim);

          try {
            const receiptId = await captureReceipt({
              id: claim.id,
              url: primaryEvidence.url,
              quote: primaryEvidence.quote,
            });
            if (receiptId) {
              claim.receiptId = receiptId;
            }
          } catch (receiptErr) {
            console.warn(`[checkTurn] receipt capture skipped for ${claim.id}:`, receiptErr);
          }
        }

        claim.status = "done";
        emit(claim);
      } catch (err) {
        console.warn(`[checkTurn] verification error for claim ${claim.id}:`, err);
        claim.status = "error";
        claim.verdict = "unverifiable";
        claim.explanation = "Verification encountered an unexpected error.";
        emit(claim);
      }
    })
  );

  return claims;
}
