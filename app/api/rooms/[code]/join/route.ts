import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { name } = await req.json().catch(() => ({}));
  const res = joinRoom(code, String(name ?? "").trim().slice(0, 24) || "Player 2");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.error === "Room not found" ? 404 : 409 });
  return NextResponse.json({ slot: res.slot });
}
