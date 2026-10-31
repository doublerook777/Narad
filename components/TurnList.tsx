import type { PlayerSlot, Room } from "@/lib/types";
import ClaimCard from "./ClaimCard";

export default function TurnList({ room, code, me, now }: { room: Room; code: string; me: PlayerSlot | null; now: number }) {
  const turns = [...room.turns].reverse();
  if (turns.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-serif text-3xl italic text-body-strong">No arguments yet.</p>
        <p className="mt-1 text-sm text-mute">The first claim hasn&apos;t been made. Facts will be checked the moment it lands.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {turns.map((t) => {
        const claims = room.claims.filter((c) => c.turnId === t.id);
        const name = room.players[t.player]?.name ?? t.player;
        const extracting = t.text && claims.length === 0 && now - t.submittedAt < 30_000;
        return (
          <section key={t.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-body-strong">{name}</h3>
              <span className="eyebrow">Round {t.round}</span>
            </div>
            <blockquote className="border-l border-hairline pl-4 text-sm leading-6 text-body">
              {t.text || <span className="italic text-mute">Ran out of time and passed.</span>}
            </blockquote>
            <div className="mt-3 space-y-3">
              {extracting && <p className="pulse font-mono text-xs text-mute">Picking out the facts…</p>}
              {t.text && !extracting && claims.length === 0 && <p className="text-xs text-mute">No checkable claims found.</p>}
              {claims.map((c) => <ClaimCard key={c.id} claim={c} room={room} code={code} me={me} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
