import { json } from "./gemini";
import type { Stance } from "./types";

// Referee for one argument: is it about the motion, and does it argue the player's own side?
// Real mode asks Gemini (1 short call per turn). Mock mode uses a free keyword check so PIPELINE=mock stays offline.
export interface Judgement {
  offTopic: boolean;         // some or all of the argument strays from the motion  -> -20
  entirelyOffTopic: boolean; // nothing relevant: skip fact-checking it entirely
  wrongSide: boolean;        // clearly argues against the player's own stance (only when on-topic) -> -5
  note?: string;             // one short sentence shown on the penalty
}

const OK: Judgement = { offTopic: false, entirelyOffTopic: false, wrongSide: false };
const STOP = new Set(["that", "this", "than", "with", "from", "have", "more", "most", "should", "would", "could", "about", "their", "there", "which", "better", "worse", "good", "bad"]);

function heuristic(topic: string, text: string): Judgement {
  const words = topic.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 5));
  const body = text.toLowerCase();
  const hit = words.length === 0 || words.some((w) => body.includes(w));
  return hit ? OK : { offTopic: true, entirelyOffTopic: true, wrongSide: false, note: "Nothing here is about the motion." };
}

export async function judgeTurn(input: { topic: string; stance: Stance; text: string; opponentLastTurn?: string }): Promise<Judgement> {
  const { topic, stance, text, opponentLastTurn } = input;
  if (!text.trim()) return OK;
  if (process.env.PIPELINE !== "real" || !process.env.GEMINI_API_KEY) return heuristic(topic, text);

  const prompt = `You are the referee of a 1v1 fact-based debate.
Motion: "${topic}"
This speaker must argue ${stance.toUpperCase()} the motion.${opponentLastTurn ? `\nOpponent's previous turn (context only): "${opponentLastTurn.slice(0, 500)}"` : ""}

Speaker's argument:
"""
${text.slice(0, 700)}
"""

Decide:
1. onTopic:
   - "fully": every substantial point is about the subject of the motion. Rebutting the opponent, giving context or evidence for the motion, and conceding a minor point all count as on-topic.
   - "partly": at least one substantial sentence or claim is unrelated to the motion.
   - "none": essentially nothing in it is about the motion (random facts, small talk, insults only).
2. leans: which side the argument as a whole pushes: "for", "against", or "neutral" (mixed, purely factual, a rebuttal that doesn't take a side, or unclear). Use "for"/"against" only when it is clearly one-sided.
3. note: one short sentence (max 14 words) explaining the problem if onTopic is not "fully", otherwise an empty string.`;

  try {
    const out = await json<{ onTopic: "fully" | "partly" | "none"; leans: "for" | "against" | "neutral"; note?: string }>(
      prompt,
      {
        type: "object",
        properties: {
          onTopic: { type: "string", enum: ["fully", "partly", "none"] },
          leans: { type: "string", enum: ["for", "against", "neutral"] },
          note: { type: "string" },
        },
        required: ["onTopic", "leans"],
      },
      { cacheKind: "judge", cacheKey: `${topic}|${stance}|${text}` },
    );
    const offTopic = out.onTopic === "partly" || out.onTopic === "none";
    const wrongSide = !offTopic && (out.leans === "for" || out.leans === "against") && out.leans !== stance;
    const note = out.note?.trim() || (wrongSide ? `This argues ${out.leans} the motion, but you are ${stance}.` : undefined);
    return { offTopic, entirelyOffTopic: out.onTopic === "none", wrongSide, note };
  } catch (err) {
    console.warn("[judge] failed, giving the benefit of the doubt:", (err as Error)?.message || err);
    return OK; // never penalise a player because the referee was unavailable
  }
}
