"use client";
import { useEffect, useRef } from "react";
import type { PlayerSlot, Room, Turn } from "@/lib/types";
import ClaimCard from "./ClaimCard";
import { StanceChip } from "./VersusBar";

function Avatar({ slot, name }: { slot: PlayerSlot; name: string }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${slot === "p1" ? "bg-canvas text-ink ring-1 ring-mute" : "bg-primary text-on-primary"}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** One argument as a chat bubble (P1 on the left, P2 on the right), with its fact-checked claims underneath. */
function Message({ turn, room, code, me, now }: { turn: Turn; room: Room; code: string; me: PlayerSlot | null; now: number }) {
  const right = turn.player === "p2";
  const name = room.players[turn.player]?.name ?? turn.player;
  const claims = room.claims.filter((c) => c.turnId === turn.id);
  // Only "picking out facts" while the referee/extractor are still working; an off-topic turn may never get claims.
  const extracting = !!turn.text && claims.length === 0 && now - turn.submittedAt < (turn.offTopic ? 12_000 : 30_000);
  const passed = !turn.text;
  return (
    <div className={`flex gap-3 ${right ? "flex-row-reverse" : ""}`}>
      <Avatar slot={turn.player} name={name} />
      <div className={`flex min-w-0 max-w-[92%] flex-1 flex-col sm:max-w-[85%] ${right ? "items-end" : "items-start"}`}>
        <div className={`mb-1 flex items-baseline gap-2 ${right ? "flex-row-reverse" : ""}`}>
          <span className="text-sm font-medium text-body-strong">{name}{me === turn.player ? " (you)" : ""}</span>
          {room.players[turn.player] && <StanceChip stance={room.players[turn.player]!.stance} />}
          <span className="eyebrow">Round {turn.round}</span>
        </div>
        <div
          className={`w-fit max-w-full rounded-lg px-4 py-3 text-base leading-6 ${
            passed ? "border border-dashed border-hairline text-mute italic"
            : right ? "rounded-tr-sm bg-primary text-on-primary" : "rounded-tl-sm border border-hairline bg-canvas-soft text-ink"
          }`}
        >
          {passed ? "Ran out of time and passed." : turn.text}
        </div>
        {turn.citedUrl && (
          <a href={turn.citedUrl} target="_blank" rel="noreferrer" className="mt-1 max-w-full truncate text-xs text-mute underline underline-offset-2 hover:text-ink">
            cited: {turn.citedUrl}
          </a>
        )}
        {turn.offTopic && <Notice tone="bad" right={right}>Off-topic · −20{turn.judgeNote ? ` · ${turn.judgeNote}` : ""}</Notice>}
        {!turn.offTopic && turn.wrongSide && <Notice tone="warn" right={right}>Argued the other side · −5{turn.judgeNote ? ` · ${turn.judgeNote}` : ""}</Notice>}
        <div className="mt-3 w-full space-y-3">
          {extracting && <p className={`pulse font-mono text-xs text-mute ${right ? "text-right" : ""}`}>Picking out the facts…</p>}
          {turn.text && !extracting && claims.length === 0 && (
            <p className={`text-xs text-mute ${right ? "text-right" : ""}`}>{turn.offTopic ? "Not fact-checked: it isn't about the motion." : "No checkable claims found."}</p>
          )}
          {claims.map((c) => <ClaimCard key={c.id} claim={c} room={room} code={code} me={me} />)}
        </div>
      </div>
    </div>
  );
}

function Notice({ tone, right, children }: { tone: "bad" | "warn"; right: boolean; children: React.ReactNode }) {
  return (
    <p className={`mt-2 max-w-full rounded-sm border px-3 py-1.5 text-xs ${tone === "bad" ? "border-bad/40 bg-bad/10 text-bad" : "border-warn/40 bg-warn/10 text-warn"} ${right ? "text-right" : ""}`}>
      {children}
    </p>
  );
}

function Thinking({ slot, name }: { slot: PlayerSlot; name: string }) {
  const right = slot === "p2";
  return (
    <div className={`flex items-center gap-3 ${right ? "flex-row-reverse" : ""}`}>
      <Avatar slot={slot} name={name} />
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-hairline px-4 py-3">
        <span className="text-sm text-mute">{name} is writing</span>
        <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="pulse h-1.5 w-1.5 rounded-full bg-mute" style={{ animationDelay: `${i * 0.2}s` }} />)}</span>
      </div>
    </div>
  );
}

export default function Chat({ room, code, me, now }: { room: Room; code: string; me: PlayerSlot | null; now: number }) {
  const bottom = useRef<HTMLDivElement>(null);
  // Scroll to the newest message when a turn lands (not on every claim update, so reading isn't interrupted).
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [room.turns.length]);

  const speaker = room.status === "active" ? room.players[room.currentPlayer] : undefined;
  const showThinking = !!speaker && room.currentPlayer !== me;
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-md text-center">
        <div className="eyebrow">The motion</div>
        <p className="mt-1 font-serif text-3xl italic leading-8 text-body-strong">{room.topic}</p>
      </div>
      {room.turns.map((t) => <Message key={t.id} turn={t} room={room} code={code} me={me} now={now} />)}
      {showThinking && <Thinking slot={room.currentPlayer} name={speaker!.name} />}
      <div ref={bottom} className="scroll-mb-40" />
    </div>
  );
}
