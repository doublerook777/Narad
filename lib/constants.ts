// Client-safe constants (no node imports). Rules from agents.md §7.
export const TURN_SECONDS = 90;
export const MAX_CHARS = 600;
export const MAX_CLAIMS_PER_TURN = 4;
export const CHALLENGES_PER_PLAYER = 2;
export const FINISH_GRACE_SECONDS = 60;
export const STALL_GRACE_SECONDS = 8; // server auto-skips a turn this long after the deadline
export const POLL_MS = 1500;
