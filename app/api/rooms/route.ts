import { NextResponse } from "next/server";
import { createRoom } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { topic, name } = await req.json().catch(() => ({}));
  const t = String(topic ?? "").trim().slice(0, 200);
  const n = String(name ?? "").trim().slice(0, 24) || "Player 1";
  if (t.length < 3) return NextResponse.json({ error: "Pick a topic" }, { status: 400 });
  const room = createRoom(t, n);
  return NextResponse.json({ code: room.code, slot: "p1" });
}
