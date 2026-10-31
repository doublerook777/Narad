import type { Investigation, Room } from "@/lib/types";

const STATUS: Record<Investigation["status"], string> = {
  queued: "Starting up…",
  running: "Investigating live",
  done: "Finished",
  cached: "From cache",
  failed: "Failed",
  skipped_budget: "Skipped",
};

export default function InvestigatorCard({ inv, room }: { inv: Investigation; room: Room }) {
  const live = inv.status === "queued" || inv.status === "running";
  const by = inv.requestedBy === "auto" ? "Auto" : room.players[inv.requestedBy]?.name ?? inv.requestedBy;
  return (
    <div className="mt-4 rounded-md border border-hairline bg-canvas p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow">The Investigator · challenged by {by}</div>
        <span className={`chip border-hairline text-body ${live ? "pulse" : ""}`}>{STATUS[inv.status]}</span>
      </div>

      {inv.status === "skipped_budget" && (
        <p className="mt-3 text-sm text-body">The Investigator budget is used up, so this challenge was not run. Your challenge is refunded.</p>
      )}

      {inv.streamingUrl && (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-md border border-hairline bg-black">
          <iframe src={inv.streamingUrl} title="Live view of the Investigator" className="h-full w-full" sandbox="allow-scripts allow-same-origin" />
        </div>
      )}

      {inv.goal && <p className="mt-3 text-sm text-body">{inv.goal}</p>}

      {inv.steps.length > 0 && (
        <ol className="mt-3 space-y-1 font-mono text-xs text-body">
          {inv.steps.map((s, i) => (
            <li key={i} className={`flex gap-2 ${live && i === inv.steps.length - 1 ? "pulse text-ink" : ""}`}>
              <span className="text-mute">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}

      {inv.result && (
        <div className="mt-3 border-t border-hairline pt-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="eyebrow">Result</span>
            <span className="font-medium text-ink capitalize">{inv.result.verdict}</span>
            {inv.result.foundValue && <span className="font-mono text-xs text-body-strong">{inv.result.foundValue}</span>}
          </div>
          <p className="mt-1 text-body">{inv.result.explanation}</p>
          {inv.result.sourceUrl && (
            <a href={inv.result.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-mute underline underline-offset-2 hover:text-ink">
              Open the data source
            </a>
          )}
        </div>
      )}
    </div>
  );
}
