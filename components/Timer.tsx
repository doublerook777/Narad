import { TURN_SECONDS } from "@/lib/constants";

export default function Timer({ remainingMs, label }: { remainingMs: number; label: string }) {
  const s = Math.max(0, Math.ceil(remainingMs / 1000));
  const low = s <= 10;
  const pct = Math.min(100, Math.max(0, (remainingMs / (TURN_SECONDS * 1000)) * 100));
  return (
    <div className="min-w-32">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">{label}</span>
        <span className={`font-mono text-lg tabular-nums ${low ? "text-bad" : "text-ink"}`}>
          {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-1 h-px w-full bg-hairline">
        <div className={`h-px ${low ? "bg-bad" : "bg-primary"}`} style={{ width: `${pct}%`, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}
