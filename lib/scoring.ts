import type { Claim, Investigation, Room, ScoreEvent, Verdict } from "./types";
import { CHALLENGES_PER_PLAYER } from "./constants";

// Pure scoring (agents.md §7). scoreRoom recomputes everything from claims + investigations,
// so calling it after any mutation is always safe.

const BASE: Record<Verdict, number> = {
  pending: 0,
  supported: 10,
  refuted: -15,
  misleading: -5,
  unverifiable: 0,
  opinion: 0,
};
const SUPPORTED_AFTER_THREE = 3;
const CITE_MATCH = 5;
const CITE_MISREPRESENTED = -10;
const CHALLENGE_WIN = 10;
const CHALLENGE_LOSS = -5;
const UNSUPPORTED_STAT = -5;
const OFF_TOPIC = -20;
const WRONG_SIDE = -5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const hasResult = (i: Investigation) => (i.status === "done" || i.status === "cached") && !!i.result;

/** A specific figure: a digit (bare years like 1986 don't count) or a magnitude word like "million". */
export function hasSpecificFigure(text: string): boolean {
  const noYears = text.replace(/\b(1[0-9]{3}|20[0-9]{2})\b/g, " ");
  return /\d/.test(noYears) || /\b(thousand|million|billion|trillion)s?\b/i.test(noYears);
}

/**
 * A factual claim built on a specific number that no source backed up ("AI doom is 68%").
 * Only counts when the fact-checker really ran (confidence > 0), so an outage or search failure never costs points.
 */
export function isUnsupportedStat(claim: Claim, verdict: Verdict): boolean {
  return claim.kind === "factual" && verdict === "unverifiable" && claim.status === "done" && claim.confidence > 0 && hasSpecificFigure(claim.text);
}

export function investigationFor(room: Room, claim: Claim): Investigation | undefined {
  return room.investigations.find((i) => i.claimId === claim.id);
}

/** The investigation's verdict replaces the claim's verdict when it found a clear answer. */
export function effectiveVerdict(room: Room, claim: Claim): Verdict {
  const inv = investigationFor(room, claim);
  const v = inv && hasResult(inv) ? inv.result!.verdict : undefined;
  if (v === "supported" || v === "refuted" || v === "misleading") return v;
  return claim.verdict;
}

const short = (s: string, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function scoreRoom(room: Room): Room {
  const prevAt = new Map(room.events.map((e) => [e.id, e.at]));
  const events: ScoreEvent[] = [];
  const supportedInTurn = new Map<string, number>();
  const citedTurns = new Set<string>(); // a cited link is judged once per turn, not once per claim
  const push = (id: string, e: Omit<ScoreEvent, "id" | "at">) =>
    events.push({ id, at: prevAt.get(id) ?? Date.now(), ...e });

  for (const claim of room.claims) {
    const verdict = effectiveVerdict(room, claim);
    let base = claim.kind === "opinion" ? 0 : BASE[verdict];
    if (verdict === "supported" && claim.kind !== "opinion") {
      const n = supportedInTurn.get(claim.turnId) ?? 0;
      supportedInTurn.set(claim.turnId, n + 1);
      base = n < 3 ? BASE.supported : SUPPORTED_AFTER_THREE;
    }
    if (isUnsupportedStat(claim, verdict)) base = UNSUPPORTED_STAT;
    let pts = Math.round(base * clamp(claim.relevance || 1, 0.5, 1));
    if (claim.citedUrlCheck === "matches" || claim.citedUrlCheck === "misrepresented") {
      if (!citedTurns.has(claim.turnId)) {
        citedTurns.add(claim.turnId);
        pts += claim.citedUrlCheck === "matches" ? CITE_MATCH : CITE_MISREPRESENTED;
      }
    }
    claim.points = pts || 0;
    if (claim.points !== 0) {
      push(`claim:${claim.id}`, {
        player: claim.player,
        delta: claim.points,
        reason: `${verdict}: ${short(claim.text)}`,
        claimId: claim.id,
      });
    }
  }

  // Referee penalties, once per turn. Straying from the motion outranks arguing the wrong side.
  for (const t of room.turns) {
    if (t.offTopic) {
      push(`turn:${t.id}:off`, { player: t.player, delta: OFF_TOPIC, reason: `off-topic: ${t.judgeNote || "strayed from the motion"}` });
    } else if (t.wrongSide) {
      push(`turn:${t.id}:side`, { player: t.player, delta: WRONG_SIDE, reason: `argued the other side: ${t.judgeNote || "against own stance"}` });
    }
  }

  for (const inv of room.investigations) {
    if (inv.requestedBy === "auto" || !hasResult(inv)) continue;
    const claim = room.claims.find((c) => c.id === inv.claimId);
    if (!claim) continue;
    const v = inv.result!.verdict;
    if (v === "refuted" || v === "misleading") {
      push(`challenge:${inv.id}`, {
        player: inv.requestedBy,
        delta: CHALLENGE_WIN,
        reason: `challenge won: ${short(claim.text, 48)}`,
        claimId: claim.id,
      });
    } else if (v === "supported") {
      push(`challenge:${inv.id}`, {
        player: inv.requestedBy,
        delta: CHALLENGE_LOSS,
        reason: `challenge failed: ${short(claim.text, 48)}`,
        claimId: claim.id,
      });
    }
  }

  events.sort((a, b) => a.at - b.at);
  room.events = events;
  for (const p of Object.values(room.players)) {
    if (!p) continue;
    p.score = events.filter((e) => e.player === p.slot).reduce((s, e) => s + e.delta, 0);
    // failed / budget-skipped investigations refund the challenge
    const used = room.investigations.filter(
      (i) => i.requestedBy === p.slot && i.status !== "failed" && i.status !== "skipped_budget",
    ).length;
    p.challengesLeft = Math.max(0, CHALLENGES_PER_PLAYER - used);
  }
  return room;
}

export function winner(room: Room): "p1" | "p2" | "tie" {
  const a = room.players.p1?.score ?? 0;
  const b = room.players.p2?.score ?? 0;
  return a === b ? "tie" : a > b ? "p1" : "p2";
}
