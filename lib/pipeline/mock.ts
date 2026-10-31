import type { CheckInput, Claim, Investigation, PlayerSlot } from "../types";
import { nanoid } from "nanoid";

export async function checkTurn(input: CheckInput, emit: (c: Claim) => void): Promise<Claim[]> {
  const c1: Claim = {
    id: nanoid(),
    turnId: input.turn.id,
    player: input.turn.player,
    text: input.turn.text.slice(0, 100),
    kind: "factual",
    status: "searching",
    verdict: "pending",
    confidence: 0,
    relevance: 1,
    explanation: "",
    evidence: [],
    points: 0,
  };
  emit(c1);

  await new Promise((r) => setTimeout(r, 600));
  c1.status = "judging";
  emit(c1);

  await new Promise((r) => setTimeout(r, 600));
  c1.status = "done";
  c1.verdict = "supported";
  c1.confidence = 0.95;
  c1.explanation = "Mock supported claim.";
  c1.evidence = [
    {
      url: "https://ourworldindata.org",
      title: "Our World in Data",
      domain: "ourworldindata.org",
      quote: "Example quote from mock data.",
      tier: 1,
    },
  ];
  emit(c1);

  return [c1];
}

export async function investigate(
  claim: Claim,
  requestedBy: PlayerSlot | "auto",
  emit: (i: Investigation) => void
): Promise<Investigation> {
  const inv: Investigation = {
    id: nanoid(),
    claimId: claim.id,
    requestedBy,
    status: "running",
    portalUrl: "https://ourworldindata.org",
    goal: `Investigate: ${claim.text}`,
    steps: ["Navigating to Our World in Data..."],
  };
  emit(inv);

  await new Promise((r) => setTimeout(r, 1000));
  inv.status = "done";
  inv.steps.push("Extracted confirmed statistic.");
  inv.result = {
    verdict: "supported",
    foundValue: "42%",
    sourceUrl: "https://ourworldindata.org",
    explanation: "Mock confirmed data.",
  };
  emit(inv);

  return inv;
}
