import { winner } from "@/lib/scoring";
import type { PlayerSlot, Room } from "@/lib/types";
import Timer from "./Timer";

function Side({ room, slot, me }: { room: Room; slot: PlayerSlot; me: PlayerSlot | null }) {
  const p = room.players[slot];
  const speaking = room.status === "active" && room.currentPlayer === slot;
  const right = slot === "p2";
  return (
    <div className={`card min-w-0 p-3 sm:p-4 ${speaking ? "border-primary" : ""} ${right ? "text-right" : ""}`}>
      <div className={`flex items-center gap-3 ${right ? "flex-row-reverse" : ""}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-medium ${slot === "p1" ? "bg-canvas text-ink ring-1 ring-mute" : "bg-primary text-on-primary"}`}>
          {(p?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-body-strong">{p?.name ?? "Waiting…"}{me === slot ? " (you)" : ""}</div>
          <div className="eyebrow">{speaking ? "Speaking" : p ? `${p.challengesLeft} challenge${p.challengesLeft === 1 ? "" : "s"}` : "Empty seat"}</div>
        </div>
      </div>
      <div className="mt-2 font-mono text-4xl leading-none tracking-tight tabular-nums sm:text-5xl">{p ? p.score : "–"}</div>
    </div>
  );
}

export default function VersusBar({ room, me, remainingMs }: { room: Room; me: PlayerSlot | null; remainingMs: number }) {
  const who = room.players[room.currentPlayer]?.name ?? "";
  const w = winner(room);
  return (
    <div className="sticky top-[49px] z-30 -mx-6 border-b border-hairline bg-canvas px-6 py-3">
      <div className="mx-auto grid max-w-6xl grid-cols-2 items-center gap-3 sm:grid-cols-[1fr_minmax(150px,220px)_1fr]">
        <div className="order-1"><Side room={room} slot="p1" me={me} /></div>
        <div className="order-3 col-span-2 sm:order-2 sm:col-span-1">
          {room.status === "active" && (
            <>
              <Timer remainingMs={remainingMs} totalSeconds={room.turnSeconds} label={room.currentPlayer === me ? "Your turn" : `${who}'s turn`} />
              <div className="mt-1 text-center font-mono text-[10px] uppercase tracking-wider text-mute">Round {room.round} of {room.maxRounds}</div>
            </>
          )}
          {room.status === "finishing" && <Timer remainingMs={remainingMs} totalSeconds={60} label="Final fact-checks" />}
          {room.status === "waiting" && <p className="text-center font-serif text-2xl italic text-body-strong">vs</p>}
          {room.status === "finished" && (
            <div className="text-center">
              <div className="eyebrow">Game over</div>
              <div className="font-serif text-3xl italic">{w === "tie" ? "A draw" : `${room.players[w]?.name} wins`}</div>
            </div>
          )}
        </div>
        <div className="order-2 sm:order-3"><Side room={room} slot="p2" me={me} /></div>
      </div>
    </div>
  );
}
