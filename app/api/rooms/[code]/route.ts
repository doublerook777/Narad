import { NextResponse } from "next/server";
import { getRoom, tick, touch } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const as = new URL(req.url).searchParams.get("as"); // seated players say who they are, so we can count who is present
  if ((as === "p1" || as === "p2") && getRoom(code)?.players[as]) touch(code, as);
  const room = tick(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  return NextResponse.json({ ...room, serverTime: Date.now() });
}
