"use client";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import ArgumentBox from "@/components/ArgumentBox";
import EventFeed from "@/components/EventFeed";
import Scoreboard from "@/components/Scoreboard";
import Timer from "@/components/Timer";
import TurnList from "@/components/TurnList";
import { post, saveSeat, seatKey, type RoomView, type Seat } from "@/lib/client";
import { POLL_MS } from "@/lib/constants";
import { winner } from "@/lib/scoring";

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
  const setName = setTypedName;

  // Poll the room every 1.5s.
  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
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
  }, [code]);

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

  const me = seat && room.players[seat.slot] ? seat.slot : null;
  const serverNow = now + skew;
  const remaining = room.turnDeadline - serverNow;
  const myTurn = room.status === "active" && me === room.currentPlayer;
  const canJoin = !me && !room.players.p2;
  const turnKey = String(room.turns.length);
  const who = room.players[room.currentPlayer]?.name ?? room.currentPlayer;

  return (
    <Shell
      banner={failures >= 2 ? "Connection lost. Retrying… your game is safe on the server." : undefined}
      right={
        room.status === "active" ? <Timer remainingMs={remaining} label={myTurn ? "Your time" : `${who}'s time`} />
        : room.status === "finishing" ? <Timer remainingMs={remaining} label="Final checks" /> : null
      }
    >
      <div className="grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <div>
            <div className="eyebrow">Topic · Room {room.code}</div>
            <h1 className="mt-1 text-3xl font-medium leading-9 tracking-[-0.02em]">{room.topic}</h1>
          </div>

          {room.status === "waiting" && (
            canJoin ? (
              <div className="card p-6">
                <h2 className="text-2xl font-medium tracking-tight">Join this debate</h2>
                <p className="mt-1 text-sm text-body">{room.players.p1?.name} is waiting for an opponent.</p>
                <input className="input mt-4" placeholder="Your name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} />
                {joinError && <p className="mt-2 text-sm text-bad">{joinError}</p>}
                <button className="btn-primary mt-4" onClick={join}>Join as Player 2</button>
              </div>
            ) : (
              <div className="card p-8 text-center">
                <p className="font-serif text-3xl italic text-body-strong">Waiting for an opponent…</p>
                <p className="mt-2 text-sm text-body">Share this code, or open the link in a second tab.</p>
                <div className="mt-5 font-mono text-5xl tracking-[0.3em]">{room.code}</div>
                <button
                  className="btn-outline mt-5"
                  onClick={() => { void navigator.clipboard?.writeText(`${location.origin}/room/${room.code}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                >
                  {copied ? "Link copied" : "Copy invite link"}
                </button>
              </div>
            )
          )}

          {room.status === "active" && (
            myTurn ? (
              <ArgumentBox code={code} slot={me!} turnKey={turnKey} remainingMs={remaining} round={room.round} maxRounds={room.maxRounds} />
            ) : (
              <div className="card p-6">
                <p className="pulse font-serif text-3xl italic text-body-strong">{who} is making their case…</p>
                <p className="mt-1 text-sm text-body">
                  {me ? "Look over their last claims. You can Challenge any of them below." : "You're watching this debate."}
                </p>
              </div>
            )
          )}

          {room.status === "finishing" && (
            <div className="card p-6">
              <p className="pulse font-serif text-3xl italic text-body-strong">Final fact-checks are coming in…</p>
              <p className="mt-1 text-sm text-body">The winner is announced once the last claims are judged.</p>
            </div>
          )}

          {room.status === "finished" && <Winner room={room} me={me} />}

          {room.status !== "waiting" && <TurnList room={room} code={code} me={me} now={serverNow} />}
        </div>

        <aside className="order-first space-y-4 lg:sticky lg:top-6 lg:order-none lg:self-start">
          <Scoreboard room={room} me={me} />
          {room.status !== "waiting" && <div className="hidden lg:block"><EventFeed room={room} /></div>}
        </aside>
      </div>
    </Shell>
  );
}

const subscribeNoop = () => () => {};

function Winner({ room, me }: { room: RoomView; me: "p1" | "p2" | null }) {
  const w = winner(room);
  const p1 = room.players.p1, p2 = room.players.p2;
  const title = w === "tie" ? "A draw." : `${room.players[w]?.name} wins.`;
  const youWon = me && w === me;
  return (
    <div className="card p-8 text-center">
      <div className="eyebrow">Game over</div>
      <h2 className="mt-2 font-serif text-6xl italic tracking-tight">{title}</h2>
      <p className="mt-3 font-mono text-lg tabular-nums text-body">
        {p1?.name} {p1?.score} · {p2?.score} {p2?.name}
      </p>
      <p className="mt-2 text-sm text-mute">{youWon ? "Being right paid off." : "Scroll down for every claim and its proof."}</p>
      <Link href="/" className="btn-outline mt-6">New debate</Link>
    </div>
  );
}

function Shell({ children, right, banner }: { children: React.ReactNode; right?: React.ReactNode; banner?: string }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-medium tracking-tight">Narad</Link>
          {right}
        </div>
      </header>
      {banner && (
        <div role="alert" className="border-b border-warn/40 bg-warn/10 px-6 py-2 text-center text-sm text-warn">{banner}</div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6">{children}</main>
    </>
  );
}
