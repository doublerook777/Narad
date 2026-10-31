import { customAlphabet, nanoid } from "nanoid";
import type { Claim, Investigation, PlayerSlot, Room, Turn } from "./types";
import { scoreRoom } from "./scoring";
import { CHALLENGES_PER_PLAYER, FINISH_GRACE_SECONDS, MAX_CHARS, STALL_GRACE_SECONDS, clampTurnSeconds } from "./constants";

// In-memory rooms. Kept on globalThis because Next dev hot-reload re-imports modules.
const g = globalThis as unknown as {
  __naradRooms?: Map<string, Room>;
  __naradWork?: Map<string, number>;
};
const rooms = (g.__naradRooms ??= new Map<string, Room>());
const work = (g.__naradWork ??= new Map<string, number>()); // in-flight pipeline jobs per room

const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ", 4);
const player = (slot: PlayerSlot, name: string) => ({ slot, name, score: 0, challengesLeft: CHALLENGES_PER_PLAYER });
const other = (s: PlayerSlot): PlayerSlot => (s === "p1" ? "p2" : "p1");

type Fail = { ok: false; error: string };

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

/** Apply a change, rescore, bump version. */
export function mutate(code: string, fn: (room: Room) => void): Room | undefined {
  const room = getRoom(code);
  if (!room) return undefined;
  fn(room);
  scoreRoom(room);
  room.version++;
  return room;
}

export function createRoom(topic: string, name: string, opts: { isPublic?: boolean; turnSeconds?: number } = {}): Room {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();
  const room: Room = {
    code, topic, status: "waiting",
    players: { p1: player("p1", name) },
    currentPlayer: "p1", round: 1, maxRounds: 3, turnDeadline: 0,
    turnSeconds: clampTurnSeconds(opts.turnSeconds), isPublic: opts.isPublic !== false,
    turns: [], claims: [], investigations: [], events: [], version: 1,
  };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, name: string): { ok: true; room: Room; slot: PlayerSlot } | Fail {
  const room = getRoom(code);
  if (!room) return { ok: false, error: "Room not found" };
  if (room.players.p2) return { ok: false, error: "Room is full" };
  mutate(code, (r) => {
    r.players.p2 = player("p2", name);
    r.status = "active";
    r.turnDeadline = Date.now() + r.turnSeconds * 1000;
  });
  return { ok: true, room, slot: "p2" };
}

export function submitTurn(
  code: string, slot: PlayerSlot, text: string, citedUrl?: string, allowEmpty = false,
): { ok: true; room: Room; turn: Turn } | Fail {
  const room = getRoom(code);
  if (!room) return { ok: false, error: "Room not found" };
  if (room.status !== "active") return { ok: false, error: "Game is not active" };
  if (room.currentPlayer !== slot) return { ok: false, error: "Not your turn" };
  text = text.trim().slice(0, MAX_CHARS);
  if (!text && !allowEmpty) return { ok: false, error: "Write an argument first" };
  const turn: Turn = {
    id: nanoid(8), player: slot, round: room.round, text,
    citedUrl: citedUrl?.trim() || undefined, submittedAt: Date.now(),
  };
  mutate(code, (r) => {
    r.turns.push(turn);
    if (slot === "p2" && r.round >= r.maxRounds) {
      r.status = "finishing";
      r.turnDeadline = Date.now() + FINISH_GRACE_SECONDS * 1000; // grace for pending checks
    } else {
      if (slot === "p2") r.round++;
      r.currentPlayer = other(slot);
      r.turnDeadline = Date.now() + r.turnSeconds * 1000;
    }
  });
  return { ok: true, room, turn };
}

/** Pipeline `emit` target: replace the claim by id (keeps array order), keep store-owned fields. */
export function upsertClaim(code: string, claim: Claim) {
  mutate(code, (r) => {
    const i = r.claims.findIndex((c) => c.id === claim.id);
    if (i === -1) r.claims.push({ ...claim });
    else r.claims[i] = { ...claim, investigationId: claim.investigationId ?? r.claims[i].investigationId };
  });
}

/** One investigation per claim, keyed by claimId so the queued placeholder gets replaced. */
export function upsertInvestigation(code: string, inv: Investigation) {
  mutate(code, (r) => {
    const i = r.investigations.findIndex((x) => x.claimId === inv.claimId);
    if (i === -1) r.investigations.push({ ...inv });
    else r.investigations[i] = { ...inv };
    const claim = r.claims.find((c) => c.id === inv.claimId);
    if (claim) claim.investigationId = inv.id;
  });
}

export function startChallenge(
  code: string, claimId: string, by: PlayerSlot,
): { ok: true; claim: Claim } | Fail {
  const room = getRoom(code);
  if (!room) return { ok: false, error: "Room not found" };
  if (room.status === "waiting" || room.status === "finished") return { ok: false, error: "Game is not running" };
  const claim = room.claims.find((c) => c.id === claimId);
  if (!claim) return { ok: false, error: "Claim not found" };
  if (claim.player === by) return { ok: false, error: "You can only challenge your opponent" };
  if (claim.verdict === "pending" || claim.kind === "opinion") return { ok: false, error: "That claim can't be challenged yet" };
  if (room.investigations.some((i) => i.claimId === claimId)) return { ok: false, error: "Already challenged" };
  if ((room.players[by]?.challengesLeft ?? 0) <= 0) return { ok: false, error: "No challenges left" };
  upsertInvestigation(code, {
    id: nanoid(8), claimId, requestedBy: by, status: "queued", portalUrl: "", goal: "", steps: [],
  });
  return { ok: true, claim: { ...claim } };
}

/** Track a pipeline job so the game doesn't finish while checks are running. */
export function trackWork(code: string, job: Promise<unknown>) {
  const key = code.toUpperCase();
  work.set(key, (work.get(key) ?? 0) + 1);
  const done = () => work.set(key, Math.max(0, (work.get(key) ?? 1) - 1));
  job.then(done, done);
}

/** Pipeline crashed: settle this turn's unfinished claims as unverifiable so nothing hangs. */
export function failClaims(code: string, filter: (c: Claim) => boolean) {
  mutate(code, (r) => {
    for (const c of r.claims) {
      if (filter(c) && c.status !== "done") {
        c.status = "done";
        c.verdict = c.verdict === "pending" ? "unverifiable" : c.verdict;
        c.explanation = c.explanation || "Could not be checked.";
      }
    }
  });
}

export function failInvestigation(code: string, claimId: string) {
  mutate(code, (r) => {
    const inv = r.investigations.find((i) => i.claimId === claimId);
    if (inv && (inv.status === "queued" || inv.status === "running")) {
      inv.status = "failed";
      inv.result = { verdict: "unverifiable", explanation: "The Investigator could not finish." };
    }
  });
}

const pipelineIdle = (room: Room) =>
  (work.get(room.code) ?? 0) === 0 &&
  room.claims.every((c) => c.status === "done" || c.status === "error") &&
  room.investigations.every((i) => i.status !== "queued" && i.status !== "running");

/** Lazy housekeeping on every poll: skip a stalled turn, finish the game. */
export function tick(code: string): Room | undefined {
  let room = getRoom(code);
  if (!room) return undefined;
  const now = Date.now();
  if (room.status === "active" && now > room.turnDeadline + STALL_GRACE_SECONDS * 1000) {
    submitTurn(code, room.currentPlayer, "", undefined, true); // nobody submitted: pass
  }
  room = getRoom(code)!;
  if (room.status === "finishing" && (pipelineIdle(room) || now > room.turnDeadline)) {
    // Anything still running after the grace period is settled so the final screen never spins.
    failClaims(code, () => true);
    for (const i of room.investigations) failInvestigation(code, i.claimId);
    mutate(code, (r) => { r.status = "finished"; });
  }
  return getRoom(code);
}
