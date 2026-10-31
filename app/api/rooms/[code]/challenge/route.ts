import { NextResponse } from "next/server";
import { investigate } from "@/lib/pipeline";
import { failInvestigation, startChallenge, trackWork, upsertInvestigation } from "@/lib/store";
import type { PlayerSlot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const { claimId, by } = await req.json().catch(() => ({}));
  if (by !== "p1" && by !== "p2") return NextResponse.json({ error: "Bad slot" }, { status: 400 });

  const res = startChallenge(code, String(claimId), by as PlayerSlot);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.error === "Room not found" ? 404 : 409 });

  const job = investigate(res.claim, by, (i) => upsertInvestigation(code, i))
    .then((final) => upsertInvestigation(code, final))
    .catch((e) => {
      console.error("investigate failed", e);
      failInvestigation(code, res.claim.id);
    });
  trackWork(code, job);
  return NextResponse.json({ ok: true });
}
