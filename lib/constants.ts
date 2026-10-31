// Client-safe constants (no node imports). Rules from agents.md §7.
export const DEFAULT_TURN_SECONDS = 90;
export const MIN_TURN_SECONDS = 30;
export const MAX_TURN_SECONDS = 120; // room creator picks, never more than 2 minutes
export const clampTurnSeconds = (n: unknown) =>
  Math.min(MAX_TURN_SECONDS, Math.max(MIN_TURN_SECONDS, Math.round(Number(n)) || DEFAULT_TURN_SECONDS));
export const MAX_CHARS = 600;
export const MAX_CLAIMS_PER_TURN = 4;
export const CHALLENGES_PER_PLAYER = 2;
export const FINISH_GRACE_SECONDS = 60;
export const STALL_GRACE_SECONDS = 8; // server auto-skips a turn this long after the deadline
export const POLL_MS = 1500;
export const MIN_ROUNDS = 3;
export const MAX_ROUNDS = 20;
export const DEFAULT_ROUNDS = 3;
export const clampRounds = (n: unknown) => Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Math.round(Number(n)) || DEFAULT_ROUNDS));
