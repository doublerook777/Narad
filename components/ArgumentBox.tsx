"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_CHARS } from "@/lib/constants";
import { post } from "@/lib/client";
import type { PlayerSlot, Stance } from "@/lib/types";

interface Props { code: string; slot: PlayerSlot; turnKey: string; remainingMs: number; totalSeconds: number; stance: Stance; topic: string }

/** The message box pinned to the bottom of the screen, like a chat app. */
export default function ArgumentBox({ code, slot, turnKey, remainingMs, totalSeconds, stance, topic }: Props) {
  const [text, setText] = useState("");
  const [cite, setCite] = useState("");
  const [showCite, setShowCite] = useState(false);
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
    if (ok) { setText(""); setCite(""); setShowCite(false); }
    else { sent.current = ""; setError(data.error ?? "Could not submit."); }
  }

  // When the clock hits zero, send whatever is in the box (agents.md §7).
  useEffect(() => {
    if (remainingMs > 0) return;
    const t = setTimeout(() => void submit(true), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs <= 0, turnKey]);

  const s = Math.max(0, Math.ceil(remainingMs / 1000));
  const pct = Math.min(100, Math.max(0, (remainingMs / (totalSeconds * 1000)) * 100));
  const low = s <= 10;
  return (
    <div className="sticky bottom-0 z-30 -mx-6 border-t border-hairline bg-canvas px-6 pb-4 pt-3 lg:mx-0 lg:px-0">
      <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
        <div className={`h-1 rounded-full ${low ? "bg-bad" : "bg-primary"}`} style={{ width: `${pct}%`, transition: "width 1s linear" }} />
      </div>
      <p className="mt-2 text-xs text-body">
        You argue <span className="font-mono font-medium uppercase text-ink">{stance}</span>: <span className="italic">{topic}</span>
        <span className="text-mute"> · off-topic −20 · arguing the other side −5</span>
      </p>
      <div className="mt-2 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <textarea
            className="input h-24 resize-none text-base leading-6"
            placeholder="Make your case. Every factual claim gets checked…"
            maxLength={MAX_CHARS}
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(); }}
            autoFocus
          />
          {showCite && (
            <input
              className="input mt-2"
              placeholder="Link to the source you're citing (+5 if it backs you up, −10 if it doesn't)"
              value={cite} disabled={busy} onChange={(e) => setCite(e.target.value)}
            />
          )}
          <div className="mt-1 flex items-center justify-between text-xs text-mute">
            <button className="underline underline-offset-2 hover:text-ink" onClick={() => setShowCite((v) => !v)}>{showCite ? "Remove source link" : "Cite a source"}</button>
            <span className="font-mono tabular-nums">{MAX_CHARS - text.length} left · Ctrl+Enter to send</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className={`font-mono text-2xl tabular-nums ${low ? "pulse text-bad" : "text-ink"}`}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>
          <button className="btn-primary" disabled={busy || !text.trim()} onClick={() => submit()}>{busy ? "Sending…" : "Send"}</button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
