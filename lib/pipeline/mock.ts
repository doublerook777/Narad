import { nanoid } from "nanoid";
import type { CheckInput, Claim, Evidence, Investigation, PlayerSlot } from "../types";
import { MAX_CLAIMS_PER_TURN } from "../constants";

// Fake pipeline so the UI can be built without A's real one. Same signatures as agents.md §3.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (base: number) => base + Math.random() * base;

const OPINION = /\b(i believe|i think|i feel|in my opinion|i hate|i love|should|never trust|beautiful|worst|best)\b/i;
const FALSE_HINT = /(million|more deaths|per terawatt-hour than coal|all of|100%|never)/i;

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
}

function fakeEvidence(): Evidence[] {
  return [
    {
      url: "https://ourworldindata.org/safest-sources-of-energy",
      title: "What are the safest and cleanest sources of energy?",
      domain: "ourworldindata.org",
      quote: "Death rates are measured as deaths per terawatt-hour of electricity production.",
      tier: 1,
    },
    {
      url: "https://en.wikipedia.org/wiki/Nuclear_power",
      title: "Nuclear power - Wikipedia",
      domain: "wikipedia.org",
      quote: "Nuclear power provides about 10% of the world's electricity.",
      tier: 2,
    },
  ];
}

function verdictFor(text: string): Claim["verdict"] {
  if (FALSE_HINT.test(text)) return "refuted";
  const sum = [...text].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  if (sum % 7 === 0) return "misleading";
  if (sum % 6 === 0) return "unverifiable";
  return "supported";
}

export async function checkTurn(input: CheckInput, emit: (c: Claim) => void): Promise<Claim[]> {
  const { turn } = input;
  const claims: Claim[] = sentences(turn.text)
    .slice(0, MAX_CLAIMS_PER_TURN)
    .map((text) => ({
      id: nanoid(8),
      turnId: turn.id,
      player: turn.player,
      text,
      kind: OPINION.test(text) ? "opinion" : "factual",
      status: "queued",
      verdict: "pending",
      confidence: 0,
      relevance: 1,
      explanation: "",
      evidence: [],
      points: 0,
      citedUrl: turn.citedUrl,
    }));

  await sleep(jitter(500)); // "extraction" call
  claims.forEach((c) => emit({ ...c }));

  await Promise.all(
    claims.map(async (c) => {
      const set = (patch: Partial<Claim>) => {
        Object.assign(c, patch);
        emit({ ...c, evidence: [...c.evidence] });
      };
      if (c.kind === "opinion") {
        await sleep(jitter(300));
        set({ status: "done", verdict: "opinion", explanation: "An opinion, not a checkable fact." });
        return;
      }
      set({ status: "searching" });
      await sleep(jitter(800));
      set({ status: "fetching" });
      await sleep(jitter(900));
      set({ status: "judging" });
      await sleep(jitter(700));
      const verdict = verdictFor(c.text);
      const explanation = {
        supported: "Matches what the sources say.",
        refuted: "Sources contradict this figure.",
        misleading: "Technically true but leaves out important context.",
        unverifiable: "No reliable source found either way.",
      }[verdict as "supported" | "refuted" | "misleading" | "unverifiable"];
      set({
        status: "receipt",
        verdict,
        explanation,
        confidence: 0.8,
        relevance: 0.7 + Math.random() * 0.3,
        evidence: verdict === "unverifiable" ? [] : fakeEvidence(),
        citedUrlCheck: c.citedUrl ? (verdict === "supported" ? "matches" : "misrepresented") : undefined,
      });
      await sleep(jitter(700));
      set({ status: "done" });
    })
  );
  return claims;
}

export async function investigate(
  claim: Claim,
  requestedBy: PlayerSlot | "auto",
  emit: (i: Investigation) => void
): Promise<Investigation> {
  const inv: Investigation = {
    id: nanoid(8),
    claimId: claim.id,
    requestedBy,
    status: "queued",
    portalUrl: "https://ourworldindata.org/grapher/death-rates-from-energy-production-per-twh",
    goal: `Find the real figure behind: "${claim.text}"`,
    steps: [],
  };
  const set = (patch: Partial<Investigation>) => {
    Object.assign(inv, patch);
    emit({ ...inv, steps: [...inv.steps] });
  };
  set({});
  await sleep(1200);
  set({ status: "running" });
  for (const step of [
    "Opening Our World in Data",
    "Looking for the indicator: death rate per TWh",
    "Selecting energy sources in the chart",
    "Reading values for coal and nuclear",
    "Comparing the two numbers",
  ]) {
    await sleep(1400);
    set({ steps: [...inv.steps, step] });
  }
  const refuted = FALSE_HINT.test(claim.text) || claim.verdict === "refuted";
  set({
    status: "done",
    result: refuted
      ? {
          verdict: "refuted",
          foundValue: "Coal 24.6 vs nuclear 0.03 deaths per TWh",
          sourceUrl: inv.portalUrl,
          explanation: "Coal is hundreds of times deadlier than nuclear, not the other way round.",
        }
      : {
          verdict: "supported",
          foundValue: "Coal 24.6 vs nuclear 0.03 deaths per TWh",
          sourceUrl: inv.portalUrl,
          explanation: "The chart backs up the claim.",
        },
  });
  return inv;
}
