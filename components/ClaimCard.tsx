"use client";
import { useState } from "react";
import { post } from "@/lib/client";
import type { Claim, ClaimStatus, PlayerSlot, Room, Verdict } from "@/lib/types";
import { effectiveVerdict } from "@/lib/scoring";
import InvestigatorCard from "./InvestigatorCard";

const VERDICT: Record<Verdict, { label: string; cls: string }> = {
  pending: { label: "Checking", cls: "border-hairline text-body" },
  supported: { label: "Supported", cls: "border-ok/40 bg-ok/10 text-ok" },
  refuted: { label: "Refuted", cls: "border-bad/40 bg-bad/10 text-bad" },
  misleading: { label: "Misleading", cls: "border-warn/40 bg-warn/10 text-warn" },
  unverifiable: { label: "Unverifiable", cls: "border-hairline text-body" },
  opinion: { label: "Opinion", cls: "border-hairline text-mute" },
};
const STAGE: Partial<Record<ClaimStatus, string>> = {
  queued: "Queued", searching: "Searching sources", fetching: "Reading pages", judging: "Judging", receipt: "Taking a screenshot of the proof",
};
const CITE: Record<NonNullable<Claim["citedUrlCheck"]>, string> = {
  matches: "Cited source backs this up (+5)",
  misrepresented: "Cited source says something else (−10)",
  unreadable: "Cited source could not be read",
};

interface Props { claim: Claim; room: Room; code: string; me: PlayerSlot | null }

export default function ClaimCard({ claim, room, code, me }: Props) {
  const [zoom, setZoom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const verdict = effectiveVerdict(room, claim);
  const v = VERDICT[verdict];
  const working = claim.status !== "done" && claim.status !== "error";
  const inv = room.investigations.find((i) => i.claimId === claim.id);
  const challengesLeft = me ? room.players[me]?.challengesLeft ?? 0 : 0;
  const canChallenge =
    !!me && me !== claim.player && !inv && claim.kind === "factual" && claim.verdict !== "pending" &&
    claim.status === "done" && room.status !== "waiting" && room.status !== "finished" && challengesLeft > 0;

  async function challenge() {
    setBusy(true); setErr("");
    const { ok, data } = await post(`/api/rooms/${code}/challenge`, { claimId: claim.id, by: me });
    setBusy(false);
    if (!ok) setErr(data.error ?? "Challenge failed");
  }

  const sign = claim.points > 0 ? "+" : claim.points < 0 ? "−" : "";
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-base text-ink">{claim.text}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`chip ${v.cls} ${working ? "pulse" : ""}`}>{working && claim.verdict === "pending" ? "Checking" : v.label}</span>
          {!working && claim.points !== 0 && (
            <span className={`font-mono text-sm tabular-nums ${claim.points > 0 ? "text-ok" : "text-bad"}`}>{sign}{Math.abs(claim.points)}</span>
          )}
        </div>
      </div>

      {working && <p className="pulse mt-2 font-mono text-xs text-mute">{STAGE[claim.status]}…</p>}
      {claim.explanation && <p className="mt-2 text-sm text-body">{claim.explanation}</p>}
      {claim.citedUrlCheck && <p className="mt-1 text-xs text-mute">{CITE[claim.citedUrlCheck]}</p>}

      {(claim.evidence.length > 0 || claim.receiptId) && (
        <div className="mt-3 flex gap-3">
          {claim.receiptId && (
            <button onClick={() => setZoom(true)} className="group relative h-20 w-32 shrink-0 overflow-hidden rounded-sm border border-hairline" aria-label="Open proof screenshot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/receipts/${claim.receiptId}`} alt="Highlighted proof from the source" className="h-full w-full object-cover object-top" />
              <span className="absolute inset-x-0 bottom-0 bg-canvas/80 px-1 text-left font-mono text-[10px] text-body opacity-0 group-hover:opacity-100">Proof</span>
            </button>
          )}
          <ul className="min-w-0 flex-1 space-y-2">
            {claim.evidence.slice(0, 2).map((e) => (
              <li key={e.url} className="text-xs">
                <a href={e.url} target="_blank" rel="noreferrer" className="font-medium text-body-strong underline underline-offset-2 hover:text-ink">
                  {e.domain}
                </a>
                <span className="ml-2 font-mono text-[10px] text-mute">tier {e.tier}</span>
                <p className="mt-0.5 line-clamp-2 text-mute">“{e.quote}”</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canChallenge && (
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-outline" onClick={challenge} disabled={busy}>
            {busy ? "Sending…" : `Challenge · ${challengesLeft} left`}
          </button>
          <span className="text-xs text-mute">Sends the Investigator to dig up the real number.</span>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-bad">{err}</p>}
      {inv && <InvestigatorCard inv={inv} room={room} />}

      {zoom && claim.receiptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/receipts/${claim.receiptId}`} alt="Highlighted proof from the source" className="max-h-full max-w-full rounded-md border border-hairline" />
        </div>
      )}
    </div>
  );
}
