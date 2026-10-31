import { NextResponse } from "next/server";
import { tick } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = tick(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  return NextResponse.json({ ...room, serverTime: Date.now() });
}
