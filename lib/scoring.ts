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

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const hasResult = (i: Investigation) => (i.status === "done" || i.status === "cached") && !!i.result;

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
    let pts = Math.round(base * clamp(claim.relevance || 1, 0.5, 1));
    if (claim.citedUrlCheck === "matches") pts += CITE_MATCH;
    if (claim.citedUrlCheck === "misrepresented") pts += CITE_MISREPRESENTED;
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
