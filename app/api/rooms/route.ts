import { NextResponse } from "next/server";
import { createRoom, listPublicRooms } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ rooms: listPublicRooms() });
}

export async function POST(req: Request) {
  const { topic, name, isPublic, turnSeconds, stance, maxRounds } = await req.json().catch(() => ({}));
  const t = String(topic ?? "").trim().slice(0, 200);
  const n = String(name ?? "").trim().slice(0, 24) || "Player 1";
  if (t.length < 3) return NextResponse.json({ error: "Pick a topic" }, { status: 400 });
  const room = createRoom(t, n, { isPublic: isPublic !== false, turnSeconds, stance: stance === "against" ? "against" : "for", maxRounds });
  return NextResponse.json({ code: room.code, slot: "p1" });
}
