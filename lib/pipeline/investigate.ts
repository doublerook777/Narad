import { nanoid } from "nanoid";
import { getTinyFishClient } from "../tinyfish";
import { canRunAgent, recordAgentRun } from "../budget";
import { resolvePortalForClaim } from "../sources";
import { getCache, setCache } from "../cache";
import type { Claim, Investigation, PlayerSlot, Verdict } from "../types";

function extractResultJson(raw: any): {
  verdict: Verdict;
  foundValue?: string;
  sourceUrl?: string;
  explanation: string;
} {
  let parsed: any = null;

  if (typeof raw === "object" && raw !== null) {
    parsed = raw;
  } else if (typeof raw === "string") {
    let clean = raw.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Fallback text parsing if not strict JSON
      parsed = null;
    }
  }

  const validVerdicts: Verdict[] = ["supported", "refuted", "misleading", "unverifiable"];
  let verdict: Verdict = "unverifiable";

  if (parsed?.verdict && validVerdicts.includes(parsed.verdict.toLowerCase())) {
    verdict = parsed.verdict.toLowerCase() as Verdict;
  } else if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (lower.includes("refuted") || lower.includes("disproved") || lower.includes("false")) {
      verdict = "refuted";
    } else if (lower.includes("supported") || lower.includes("verified") || lower.includes("true")) {
      verdict = "supported";
    } else if (lower.includes("misleading")) {
      verdict = "misleading";
    }
  }

  return {
    verdict,
    foundValue: parsed?.foundValue ? String(parsed.foundValue) : undefined,
    sourceUrl: parsed?.sourceUrl ? String(parsed.sourceUrl) : undefined,
    explanation:
      parsed?.explanation ||
      (typeof raw === "string" ? raw.slice(0, 200) : "Investigation completed by TinyAgent."),
  };
}

export async function investigate(
  claim: Claim,
  requestedBy: PlayerSlot | "auto",
  emit: (i: Investigation) => void
): Promise<Investigation> {
  const target = resolvePortalForClaim(claim.text);

  const inv: Investigation = {
    id: nanoid(),
    claimId: claim.id,
    requestedBy,
    status: "queued",
    portalUrl: target.url,
    goal: target.suggestedGoal,
    steps: [`Queued investigation on ${target.portalName}...`],
  };
  emit(inv);

  // 1. Check disk cache
  const cached = await getCache<Investigation>("investigation", claim.text);
  if (cached) {
    const cachedInv: Investigation = {
      ...cached,
      id: inv.id,
      claimId: claim.id,
      requestedBy,
      status: "cached",
    };
    emit(cachedInv);
    return cachedInv;
  }

  // 2. Budget Guard: enforce AGENT_RUN_LIMIT
  const allowed = await canRunAgent();
  if (!allowed) {
    console.warn(`[investigate] AGENT_RUN_LIMIT exceeded, skipping real agent run for claim ${claim.id}`);
    inv.status = "skipped_budget";
    inv.steps.push("Skipped: TinyAgent budget run limit reached ($16 credit safety).");
    emit(inv);
    return inv;
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.warn("[investigate] TINYFISH_API_KEY not configured, cannot run live agent");
    inv.status = "failed";
    inv.steps.push("TinyFish API key not configured.");
    emit(inv);
    return inv;
  }

  try {
    inv.status = "running";
    inv.steps.push(`Connecting to ${target.portalName}...`);
    emit(inv);

    const tf = getTinyFishClient();
    const stream = await tf.agent.stream({
      url: target.url,
      goal: target.suggestedGoal,
      agent_config: { max_duration_seconds: 90 },
    });

    let runId = inv.id;

    for await (const event of stream) {
      if (event.type === "STARTED") {
        runId = (event as any).run_id || runId;
        inv.steps.push(`Agent started (Run: ${runId.slice(0, 8)})`);
        emit(inv);
      } else if (event.type === "STREAMING_URL") {
        inv.streamingUrl = (event as any).streaming_url;
        emit(inv);
      } else if (event.type === "PROGRESS") {
        const purpose = (event as any).purpose || (event as any).action || "Navigating portal...";
        inv.steps.push(purpose);
        emit(inv);
      } else if (event.type === "COMPLETE") {
        const rawResult = (event as any).result;
        inv.result = extractResultJson(rawResult);
        inv.status = "done";
        inv.steps.push("Investigation finished.");

        // Record steps in budget ledger
        const stepCount = Math.max(1, inv.steps.length);
        await recordAgentRun(runId, stepCount, {
          goal: inv.goal,
          portalUrl: inv.portalUrl,
        });

        // Cache completed result
        await setCache<Investigation>("investigation", claim.text, inv);

        emit(inv);
        return inv;
      }
    }

    inv.status = "done";
    emit(inv);
    return inv;
  } catch (err) {
    console.warn(`[investigate] Live agent run failed for claim ${claim.id}:`, (err as Error)?.message || err);
    inv.status = "failed";
    inv.steps.push(`Failed: ${(err as Error)?.message || "Agent execution error"}`);
    emit(inv);
    return inv;
  }
}
