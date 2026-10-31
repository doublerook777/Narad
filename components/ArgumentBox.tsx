"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_CHARS } from "@/lib/constants";
import { post } from "@/lib/client";
import type { PlayerSlot } from "@/lib/types";

interface Props { code: string; slot: PlayerSlot; turnKey: string; remainingMs: number; round: number; maxRounds: number }

export default function ArgumentBox({ code, slot, turnKey, remainingMs, round, maxRounds }: Props) {
  const [text, setText] = useState("");
  const [cite, setCite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sent = useRef<string>("");

  async function submit(timedOut = false) {
    if (sent.current === turnKey) return;
    if (!timedOut && !text.trim()) { setError("Write an argument first."); return; }
    sent.current = turnKey;
    setBusy(true); setError("");
    const { ok, data } = await post(`/api/rooms/${code}/turn`, { slot, text, citedUrl: cite || undefined, timedOut });
    setBusy(false);
    if (ok) { setText(""); setCite(""); }
    else { sent.current = ""; setError(data.error ?? "Could not submit."); }
  }

  // When the clock hits zero, send whatever is in the box (agents.md §7).
  useEffect(() => {
    if (remainingMs > 0) return;
    const t = setTimeout(() => void submit(true), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs <= 0, turnKey]);

  const left = MAX_CHARS - text.length;
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-medium tracking-tight">Your turn</h2>
        <span className="eyebrow">Round {round} of {maxRounds}</span>
      </div>
      <p className="mt-1 text-sm text-body">Make your case. Every factual claim gets checked against real sources.</p>
      <textarea
        className="input mt-4 h-36 resize-none text-base leading-6"
        placeholder="e.g. Coal causes roughly 24 deaths per terawatt-hour, while nuclear causes about 0.03."
        maxLength={MAX_CHARS}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div className="mt-1 text-right font-mono text-xs text-mute tabular-nums">{left} left</div>
      <input
        className="input mt-2"
        placeholder="Source link you're citing (optional, +5 if it backs you up, −10 if it doesn't)"
        value={cite}
        disabled={busy}
        onChange={(e) => setCite(e.target.value)}
      />
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" disabled={busy || !text.trim()} onClick={() => submit()}>
          {busy ? "Submitting…" : "Submit argument"}
        </button>
      </div>
    </div>
  );
}
