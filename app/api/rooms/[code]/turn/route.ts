import { NextResponse } from "next/server";
import { checkTurn } from "@/lib/pipeline";
import { judgeTurn } from "@/lib/judge";
import { failClaims, getRoom, setTurnJudgement, skipTurnClaims, submitTurn, trackWork, upsertClaim } from "@/lib/store";
import type { PlayerSlot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const body = await req.json().catch(() => ({}));
  const slot = body.slot as PlayerSlot;
  if (slot !== "p1" && slot !== "p2") return NextResponse.json({ error: "Bad slot" }, { status: 400 });

  const text = String(body.text ?? "");
  const res = submitTurn(code, slot, text, body.citedUrl ? String(body.citedUrl) : undefined, body.timedOut === true);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.error === "Room not found" ? 404 : 409 });

  const { turn } = res;
  if (turn.text) {
    // Fire and forget: never await the pipeline inside the POST.
    const room = getRoom(code)!;
    const prev = [...room.turns].reverse().find((t) => t.player !== slot && t.text);
    const stance = room.players[slot]?.stance ?? "for";
    // The referee (is it on the motion? which side?) and the fact-checker run side by side so claims start immediately.
    // If the referee rules the whole turn off-topic, its claims are dropped (rare, so the wasted checking is cheap).
    const judging = judgeTurn({ topic: room.topic, stance, text: turn.text, opponentLastTurn: prev?.text })
      .then((j) => {
        setTurnJudgement(code, turn.id, { offTopic: j.offTopic, wrongSide: j.wrongSide, note: j.note });
        if (j.entirelyOffTopic) skipTurnClaims(code, turn.id);
      })
      .catch((e) => console.error("judge failed", e));
    const checking = checkTurn({ topic: room.topic, turn, opponentLastTurn: prev?.text, stance }, (c) => upsertClaim(code, c))
      .then((final) => final.forEach((c) => upsertClaim(code, c)))
      .catch((e) => {
        console.error("checkTurn failed", e);
        failClaims(code, (c) => c.turnId === turn.id);
      });
    const job = Promise.all([judging, checking]);
    trackWork(code, job);
  }
  return NextResponse.json({ ok: true, turnId: turn.id });
}
