import type { Claim, Investigation, PlayerSlot } from "../types";
import { nanoid } from "nanoid";

export async function investigate(
  claim: Claim,
  requestedBy: PlayerSlot | "auto",
  emit: (i: Investigation) => void
): Promise<Investigation> {
  const inv: Investigation = {
    id: nanoid(),
    claimId: claim.id,
    requestedBy,
    status: "queued",
    portalUrl: "https://ourworldindata.org",
    goal: `Investigate factual claim: ${claim.text}`,
    steps: ["Queued investigation"],
  };
  emit(inv);

  // Phase 2 will implement live TinyAgent investigation
  inv.status = "done";
  inv.steps.push("Investigation complete (mock stub)");
  inv.result = {
    verdict: claim.verdict,
    foundValue: "Available in Phase 2",
    sourceUrl: "https://ourworldindata.org",
    explanation: "Investigation stub for Phase 1.",
  };
  emit(inv);

  return inv;
}
