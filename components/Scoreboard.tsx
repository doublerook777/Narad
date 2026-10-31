import type { PlayerSlot, Room } from "@/lib/types";

export default function Scoreboard({ room, me }: { room: Room; me: PlayerSlot | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["p1", "p2"] as const).map((slot) => {
        const p = room.players[slot];
        const active = room.status === "active" && room.currentPlayer === slot;
        return (
          <div key={slot} className={`card p-4 ${active ? "border-mute" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="eyebrow">{slot === "p1" ? "Player 1" : "Player 2"}{me === slot ? " · you" : ""}</span>
              {active && <span className="h-2 w-2 rounded-full bg-primary pulse" aria-label="their turn" />}
            </div>
            <div className="mt-1 truncate text-sm font-medium text-body-strong">{p?.name ?? "Waiting…"}</div>
            <div className="mt-2 font-mono text-4xl tracking-tight tabular-nums">{p ? p.score : "–"}</div>
            <div className="mt-1 text-xs text-mute">{p ? `${p.challengesLeft} challenge${p.challengesLeft === 1 ? "" : "s"} left` : " "}</div>
          </div>
        );
      })}
    </div>
  );
}
