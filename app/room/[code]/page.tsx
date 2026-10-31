"use client";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ArgumentBox from "@/components/ArgumentBox";
import Chat from "@/components/Chat";
import EventFeed from "@/components/EventFeed";
import VersusBar, { StanceChip } from "@/components/VersusBar";
import { fmtTime, post, saveSeat, seatKey, type RoomView, type Seat } from "@/lib/client";
import { POLL_MS } from "@/lib/constants";
import type { PlayerSlot } from "@/lib/types";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [missing, setMissing] = useState(false);
  const [seatOverride, setSeatOverride] = useState<Seat | null>(null);
  const [skew, setSkew] = useState(0); // server clock minus local clock
  const [now, setNow] = useState(() => Date.now());
  const [typedName, setTypedName] = useState<string | null>(null);
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState(false);
  const [failures, setFailures] = useState(0); // consecutive failed polls

  // Seat lives in sessionStorage (per tab) so two tabs of one browser can be two different players.
  // It is only readable on the client; useSyncExternalStore avoids a hydration mismatch.
  const storedSeat = useSyncExternalStore(subscribeNoop, () => sessionStorage.getItem(seatKey(code)), () => null);
  const pendingName = useSyncExternalStore(subscribeNoop, () => sessionStorage.getItem("narad:pendingName") ?? "", () => "");
  const seat = useMemo<Seat | null>(() => {
    if (seatOverride) return seatOverride;
    try { return storedSeat ? JSON.parse(storedSeat) : null; } catch { return null; }
  }, [seatOverride, storedSeat]);
  const name = typedName ?? pendingName;

  const me: PlayerSlot | null = seat && room?.players[seat.slot] ? seat.slot : null;
  // Polls tell the server which seat is ours, so the lobby can show who is actually in the room.
  const meRef = useRef<PlayerSlot | null>(null);
  useEffect(() => { meRef.current = me; }, [me]);

  // Poll the room every 1.5s.
  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const as = meRef.current ?? (seat?.slot ?? "");
        const res = await fetch(`/api/rooms/${code}${as ? `?as=${as}` : ""}`, { cache: "no-store" });
        if (res.status === 404) { if (!stop) setMissing(true); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: RoomView = await res.json();
        if (stop) return;
        setFailures(0);
        setSkew(data.serverTime - Date.now());
        setRoom((prev) => (prev && prev.version === data.version ? prev : data));
      } catch {
        if (!stop) setFailures((n) => n + 1); // keep the last state and retry on the next tick
      }
    }
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => { stop = true; clearInterval(id); };
  }, [code, seat?.slot]);

  // Local clock for the countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const join = useCallback(async () => {
    setJoinError("");
    const { ok, data } = await post<{ slot: "p2" }>(`/api/rooms/${code}/join`, { name });
    if (!ok) return setJoinError(data.error ?? "Could not join");
    const s: Seat = { slot: "p2", name: name.trim() || "Player 2" };
    saveSeat(code, s);
    setSeatOverride(s);
  }, [code, name]);

  if (missing) {
    return (
      <Shell>
        <div className="card mx-auto mt-24 max-w-md p-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight">Room {code} not found</h1>
          <p className="mt-2 text-sm text-body">Rooms live in the server&apos;s memory, so a restart clears them. Start a fresh one.</p>
          <Link href="/" className="btn-primary mt-6">Back home</Link>
        </div>
      </Shell>
    );
  }
  if (!room) {
    return <Shell><p className="pulse mt-24 text-center font-mono text-sm text-mute">Loading room {code}…</p></Shell>;
  }

  const serverNow = now + skew;
  const remaining = room.turnDeadline - serverNow;
  const myTurn = room.status === "active" && me === room.currentPlayer;
  const canJoin = !me && !room.players.p2;
  const inviteLink = `${location.origin}/room/${room.code}`;

  return (
    <Shell banner={failures >= 2 ? "Connection lost. Retrying… your game is safe on the server." : undefined}>
      {room.status !== "waiting" && <VersusBar room={room} me={me} remainingMs={remaining} />}

      <div className="grid gap-6 py-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {room.status === "waiting" ? (
            <Lobby
              room={room} canJoin={canJoin} name={name} setName={setTypedName} join={join} joinError={joinError}
              inviteLink={inviteLink} copied={copied}
              onCopy={() => { copyText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            />
          ) : (
            <>
              <Chat room={room} code={code} me={me} now={serverNow} />

              {room.status === "finishing" && (
                <div className="card mt-6 p-5 text-center">
                  <p className="pulse font-serif text-2xl italic text-body-strong">Final fact-checks are coming in…</p>
                  <p className="mt-1 text-sm text-body">The winner is announced once the last claims are judged.</p>
                </div>
              )}
              {room.status === "finished" && <Winner room={room} me={me} />}

              {myTurn && (
                <div className="mt-8">
                  <ArgumentBox code={code} slot={me!} turnKey={String(room.turns.length)} remainingMs={remaining} totalSeconds={room.turnSeconds} stance={room.players[me!]!.stance} topic={room.topic} />
                </div>
              )}
              {room.status === "active" && !me && <p className="mt-8 text-center text-sm text-mute">You&apos;re watching this debate.</p>}
            </>
          )}
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-56 lg:block lg:self-start">
          <div className="card p-4">
            <div className="eyebrow">Room {room.code}</div>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Time per turn</dt><dd className="font-mono tabular-nums">{fmtTime(room.turnSeconds)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Round</dt><dd className="font-mono tabular-nums">{room.round} of {room.maxRounds}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Visibility</dt><dd>{room.isPublic ? "Public" : "Private"}</dd></div>
            </dl>
          </div>
          {room.status !== "waiting" && <EventFeed room={room} />}
        </aside>
      </div>
    </Shell>
  );
}

function Lobby(props: {
  room: RoomView; canJoin: boolean; name: string; setName: (s: string) => void; join: () => void;
  joinError: string; inviteLink: string; copied: boolean; onCopy: () => void;
}) {
  const { room, canJoin, name, setName, join, joinError, inviteLink, copied, onCopy } = props;
  return (
    <div className="mx-auto max-w-xl space-y-6 pt-8">
      <div className="text-center">
        <div className="eyebrow">The motion</div>
        <h1 className="mt-1 font-serif text-4xl italic leading-10">{room.topic}</h1>
        <p className="mt-3 text-sm text-body">
          <span className="font-mono">{fmtTime(room.turnSeconds)}</span> per turn · {room.maxRounds} rounds each · {room.isPublic ? "listed in Open rooms" : "private room"}
        </p>
      </div>

      {canJoin ? (
        <div className="card p-6">
          <h2 className="text-2xl font-medium tracking-tight">Join this debate</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-body">
            {room.players.p1?.name} argues {room.players.p1 && <StanceChip stance={room.players.p1.stance} />}. You will argue
            {room.players.p1 && <StanceChip stance={room.players.p1.stance === "for" ? "against" : "for"} />}.
          </p>
          <input className="input mt-4" placeholder="Your name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} autoFocus />
          {joinError && <p className="mt-2 text-sm text-bad">{joinError}</p>}
          <button className="btn-primary mt-4" onClick={join}>Join as Player 2</button>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="pulse font-serif text-3xl italic text-body-strong">Waiting for an opponent…</p>
          {room.players.p1 && <p className="mt-2 flex items-center justify-center gap-2 text-sm text-body">You argue <StanceChip stance={room.players.p1.stance} />, your opponent gets the other side.</p>}
          <p className="mt-2 text-sm text-body">{room.isPublic ? "Your room is listed on the home page. You can also share the code." : "Share this code or link, since the room is private."}</p>
          <div className="mt-5 font-mono text-5xl tracking-[0.3em]">{room.code}</div>
          <button className="btn-outline mt-5" onClick={onCopy}>{copied ? "Link copied" : "Copy invite link"}</button>
          <input
            readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()}
            className="input mx-auto mt-3 max-w-sm text-center font-mono text-xs" aria-label="Invite link"
          />
        </div>
      )}
    </div>
  );
}

const subscribeNoop = () => () => {};

/** navigator.clipboard only exists on https/localhost; on a LAN http:// address fall back to execCommand. */
function copyText(text: string) {
  if (navigator.clipboard?.writeText) { void navigator.clipboard.writeText(text).catch(() => {}); return; }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch { /* the visible input lets them copy by hand */ }
  document.body.removeChild(ta);
}

function Winner({ room, me }: { room: RoomView; me: PlayerSlot | null }) {
  const p1 = room.players.p1, p2 = room.players.p2;
  const a = p1?.score ?? 0, b = p2?.score ?? 0;
  const w = a === b ? null : a > b ? p1 : p2;
  return (
    <div className="card mt-8 p-8 text-center">
      <div className="eyebrow">Game over</div>
      <h2 className="mt-2 font-serif text-6xl italic tracking-tight">{w ? `${w.name} wins.` : "A draw."}</h2>
      <p className="mt-3 font-mono text-lg tabular-nums text-body">{p1?.name} {a} · {b} {p2?.name}</p>
      <p className="mt-2 text-sm text-mute">{w && me === w.slot ? "Being right paid off." : "Scroll up for every claim and its proof."}</p>
      <Link href="/" className="btn-outline mt-6">New debate</Link>
    </div>
  );
}

function Shell({ children, banner }: { children: React.ReactNode; banner?: string }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-medium tracking-tight">Narad</Link>
          <Link href="/" className="text-xs text-mute hover:text-ink">Leave room</Link>
        </div>
      </header>
      {banner && <div role="alert" className="border-b border-warn/40 bg-warn/10 px-6 py-2 text-center text-sm text-warn">{banner}</div>}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6">{children}</main>
    </>
  );
}
