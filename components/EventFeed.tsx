import type { Room } from "@/lib/types";

export default function EventFeed({ room }: { room: Room }) {
  const events = [...room.events].reverse().slice(0, 12);
  return (
    <div className="card p-4">
      <div className="eyebrow mb-2">Score feed</div>
      {events.length === 0 ? (
        <p className="text-sm text-mute">Points show up here as claims are judged.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {events.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3 py-2 text-sm">
              <span className={`w-10 shrink-0 font-mono tabular-nums ${e.delta > 0 ? "text-ok" : "text-bad"}`}>
                {e.delta > 0 ? "+" : "−"}{Math.abs(e.delta)}
              </span>
              <span className="min-w-0 flex-1 text-body">
                <span className="text-body-strong">{room.players[e.player]?.name ?? e.player}</span> · {e.reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
