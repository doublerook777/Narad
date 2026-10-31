import { fmtTime } from "@/lib/client";

/** The big clock in the middle of the versus bar. Goes red and pulses in the last 10 seconds. */
export default function Timer({ remainingMs, totalSeconds, label }: { remainingMs: number; totalSeconds: number; label: string }) {
  const s = Math.max(0, Math.ceil(remainingMs / 1000));
  const low = s <= 10;
  const pct = Math.min(100, Math.max(0, (remainingMs / (totalSeconds * 1000)) * 100));
  return (
    <div className="w-full text-center">
      <div className="eyebrow truncate">{label}</div>
      <div className={`font-mono text-5xl leading-none tracking-tight tabular-nums sm:text-6xl ${low ? "pulse text-bad" : "text-ink"}`}>{fmtTime(s)}</div>
      <div className="mx-auto mt-2 h-1 w-full max-w-48 overflow-hidden rounded-full bg-hairline">
        <div className={`h-1 rounded-full ${low ? "bg-bad" : "bg-primary"}`} style={{ width: `${pct}%`, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}
