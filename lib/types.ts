export type PlayerSlot = "p1" | "p2";
export type Verdict = "pending" | "supported" | "refuted" | "misleading" | "unverifiable" | "opinion";
export type ClaimStatus = "queued" | "searching" | "fetching" | "judging" | "receipt" | "done" | "error";

export interface Evidence { url: string; title: string; domain: string; quote: string; tier: 1 | 2 | 3 }

export interface Claim {
  id: string; turnId: string; player: PlayerSlot;
  text: string; kind: "factual" | "opinion";
  status: ClaimStatus; verdict: Verdict;
  confidence: number;          // 0..1
  relevance: number;           // 0.5..1, multiplier on points
  explanation: string;         // one short sentence for the card
  evidence: Evidence[];
  receiptId?: string;          // image served at /api/receipts/[receiptId]
  citedUrl?: string;
  citedUrlCheck?: "matches" | "misrepresented" | "unreadable";
  investigationId?: string;
  points: number;              // computed by lib/scoring.ts, never by the pipeline
}

export interface Investigation {
  id: string; claimId: string; requestedBy: PlayerSlot | "auto";
  status: "queued" | "running" | "done" | "failed" | "skipped_budget" | "cached";
  portalUrl: string; goal: string;
  streamingUrl?: string;       // embed in <iframe>, read-only
  steps: string[];             // human-readable PROGRESS lines
  result?: { verdict: Verdict; foundValue?: string; sourceUrl?: string; explanation: string };
}

export interface Turn { id: string; player: PlayerSlot; round: number; text: string; citedUrl?: string; submittedAt: number }
export interface Player { slot: PlayerSlot; name: string; score: number; challengesLeft: number }
export interface ScoreEvent { id: string; at: number; player: PlayerSlot; delta: number; reason: string; claimId?: string }

export interface Room {
  code: string; topic: string;
  status: "waiting" | "active" | "finishing" | "finished";
  players: Partial<Record<PlayerSlot, Player>>;
  currentPlayer: PlayerSlot; round: number; maxRounds: number;   // maxRounds = 3 (each player gets 3 turns)
  turnDeadline: number;                                            // epoch ms, 90s per turn (UI-enforced)
  turns: Turn[]; claims: Claim[]; investigations: Investigation[];
  events: ScoreEvent[];
  version: number;                                                 // ++ on every mutation
}

export interface CheckInput { topic: string; turn: Turn; opponentLastTurn?: string }
