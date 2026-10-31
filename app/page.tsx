"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_ROUNDS, DEFAULT_TURN_SECONDS, MAX_ROUNDS, MAX_TURN_SECONDS, MIN_ROUNDS, MIN_TURN_SECONDS } from "@/lib/constants";
import { fmtTime, post, saveSeat } from "@/lib/client";
import type { LobbyRoom, TrendingTopic } from "@/lib/lobby-types";

const STEPS = [
  { n: "01", title: "Make your case", body: "Two players, three rounds each. Say what you believe and back it with facts." },
  { n: "02", title: "Every fact gets checked", body: "We search credible sources, read them, and show a screenshot of the proof. True claims earn points. Made-up ones cost you." },
  { n: "03", title: "Challenge a claim", body: "Doubt a number? Send the Investigator, a robot that browses a real data portal while you both watch." },
];

export default function Landing() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [seconds, setSeconds] = useState(DEFAULT_TURN_SECONDS);
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [stance, setStance] = useState<"for" | "against">("for");
  const [isPublic, setIsPublic] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [rooms, setRooms] = useState<LobbyRoom[] | null>(null);
  const [topics, setTopics] = useState<{ topics: TrendingTopic[]; live: boolean } | null>(null);

  // Lobby: refresh the public room list every 3s (paused while the tab is hidden), or on demand with the Refresh button.
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0); // bump to fetch the list right now (Find rooms button)
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        const data = await res.json();
        if (!stop) setRooms(data.rooms ?? []); // on failure we keep the last list instead of flashing "Looking for rooms…"
      } catch { /* keep the last list */ }
      if (!stop) setTimeout(() => setRefreshing(false), 400); // so a click on the button visibly does something
    }
    void load();
    const id = setInterval(() => { if (!document.hidden) void load(); }, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [nonce]);
  function findRooms() { setRefreshing(true); setNonce((n) => n + 1); }

  // Hot topics: slow the first time (search + Gemini), cached on the server afterwards.
  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics).catch(() => setTopics({ topics: [], live: false }));
  }, []);

  async function create() {
    if (topic.trim().length < 3) { setError("Type a topic, or pick one from Hot right now below."); topicRef.current?.focus(); return; }
    setBusy(true); setError("");
    const { ok, data } = await post<{ code: string }>("/api/rooms", { topic: topic.trim(), name, isPublic, turnSeconds: seconds, maxRounds: rounds, stance });
    setBusy(false);
    if (!ok) return setError(data.error ?? "Could not create the room");
    saveSeat(data.code, { slot: "p1", name: name.trim() || "Player 1" });
    router.push(`/room/${data.code}`);
  }

  function goTo(code: string) {
    // The room page handles the actual seat claim, so lobby clicks, typed codes and shared links all work the same way.
    if (name.trim()) sessionStorage.setItem("narad:pendingName", name.trim());
    router.push(`/room/${code.toUpperCase()}`);
  }

  function pickTopic(t: string) {
    setTopic(t);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => topicRef.current?.focus(), 400);
  }

  return (
    <>
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-medium tracking-tight">Narad</span>
          <span className="eyebrow">Fact-checked debate</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="py-14 sm:py-20">
          <h1 className="max-w-3xl text-5xl font-normal leading-[1.1] tracking-[-0.025em] sm:text-6xl">
            Win the argument by being <em className="font-serif text-[1.1em] font-normal italic">right.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-7 text-body">
            A 1v1 debate where a robot fact-checks every claim as you make it, and shows its receipts.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {/* ---- Start a debate ---- */}
          <div ref={formRef} className="card p-6">
            <h2 className="text-2xl font-medium tracking-tight">Start a debate</h2>

            <label className="eyebrow mt-5 block">Your name</label>
            <input className="input mt-1" placeholder="Ann" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />

            <label className="eyebrow mt-5 block">Topic</label>
            <input
              ref={topicRef}
              className="input mt-1"
              placeholder="e.g. Nuclear power is safer than fossil fuels"
              maxLength={200}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <p className="mt-1 text-xs text-mute">Need an idea? Pick one from “Hot right now” below.</p>

            <label className="eyebrow mt-5 block">Your side</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([["for", "For", "You argue the motion is true"], ["against", "Against", "You argue it is false"]] as const).map(([val, title, sub]) => (
                <button
                  key={val}
                  onClick={() => setStance(val)}
                  className={`rounded-sm border px-3 py-2 text-left ${stance === val ? "border-primary bg-canvas text-ink" : "border-hairline text-body hover:bg-canvas"}`}
                >
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-mute">{sub}</div>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-mute">Whoever joins gets the other side. Stay on the motion: straying costs −20, arguing your opponent&apos;s side costs −5.</p>

            <div className="mt-5 flex items-baseline justify-between">
              <label className="eyebrow" htmlFor="secs">Time per turn</label>
              <span className="font-mono text-lg tabular-nums">{fmtTime(seconds)}</span>
            </div>
            <input
              id="secs" type="range" className="mt-2 w-full accent-[#f7f5f0]"
              min={MIN_TURN_SECONDS} max={MAX_TURN_SECONDS} step={15}
              value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-mute"><span>0:30</span><span>2:00 max</span></div>

            <div className="mt-5 flex items-baseline justify-between">
              <label className="eyebrow" htmlFor="rounds">Rounds (turns each)</label>
              <span className="font-mono text-lg tabular-nums">{rounds}</span>
            </div>
            <input
              id="rounds" type="range" className="mt-2 w-full accent-[#f7f5f0]"
              min={MIN_ROUNDS} max={MAX_ROUNDS} step={1}
              value={rounds} onChange={(e) => setRounds(Number(e.target.value))}
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-mute"><span>{MIN_ROUNDS}</span><span>{MAX_ROUNDS} max</span></div>

            <label className="eyebrow mt-5 block">Who can find this room</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([[true, "Public", "Listed in Open rooms"], [false, "Private", "Only people with the code"]] as const).map(([val, title, sub]) => (
                <button
                  key={title}
                  onClick={() => setIsPublic(val)}
                  className={`rounded-sm border px-3 py-2 text-left ${isPublic === val ? "border-primary bg-canvas text-ink" : "border-hairline text-body hover:bg-canvas"}`}
                >
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-mute">{sub}</div>
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-bad">{error}</p>}
            <button className="btn-primary mt-6" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create room"}</button>
          </div>

          {/* ---- Open rooms ---- */}
          <div className="card flex flex-col p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-medium tracking-tight">Open rooms</h2>
              <div className="flex items-center gap-3">
                <span className="eyebrow flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ok pulse" />Live</span>
                <button className="btn-outline px-3 py-1 text-xs" onClick={findRooms} disabled={refreshing}>{refreshing ? "Finding…" : "Find rooms"}</button>
              </div>
            </div>

            <div className="mt-4 min-h-40 flex-1">
              {rooms === null && <p className="pulse font-mono text-xs text-mute">Looking for rooms…</p>}
              {rooms?.length === 0 && (
                <div className="py-8 text-center">
                  <p className="font-serif text-3xl italic text-body-strong">No open rooms.</p>
                  <p className="mt-1 text-sm text-mute">Start one on the left and it shows up here for others to join.</p>
                </div>
              )}
              <ul className="divide-y divide-hairline">
                {rooms?.map((r) => (
                  <li key={r.code} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{r.topic}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-mute">
                        <span>{r.host} · <span className="font-mono uppercase">{r.hostStance}</span></span>
                        <span className="font-mono">{fmtTime(r.turnSeconds)} / turn · {r.maxRounds} rounds</span>
                        <span>{r.status === "waiting" ? "Waiting for an opponent" : `Round ${r.round} of ${r.maxRounds}`}</span>
                      </p>
                    </div>
                    <Presence online={r.online} />
                    <button className={r.seatOpen ? "btn-primary" : "btn-outline"} onClick={() => goTo(r.code)}>
                      {r.seatOpen ? `Join · ${r.hostStance === "for" ? "Against" : "For"}` : "Watch"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 border-t border-hairline pt-4">
              <p className="eyebrow">Have a private code?</p>
              <div className="mt-2 flex gap-2">
                <input
                  className="input text-center font-mono text-lg uppercase tracking-[0.3em]"
                  placeholder="ABCD" maxLength={4} value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinCode.length === 4 && goTo(joinCode)}
                />
                <button className="btn-outline" disabled={joinCode.length !== 4} onClick={() => goTo(joinCode)}>Join room</button>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Hot topics ---- */}
        <section className="mt-12 border-t border-hairline pt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-3xl font-medium tracking-[-0.02em]">Hot right now</h2>
              <p className="mt-1 text-sm text-body">
                {topics?.live === false
                  ? "Live news isn't available at the moment, so here are some evergreen debates."
                  : "Debate motions pulled from the last two days of news."}
              </p>
            </div>
            {topics?.live && <span className="eyebrow">Source: TinyFish Search + Gemini</span>}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics === null && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card pulse h-40 p-5"><div className="h-3 w-16 rounded-full bg-hairline" /><div className="mt-4 h-4 w-5/6 rounded-sm bg-hairline" /><div className="mt-2 h-4 w-2/3 rounded-sm bg-hairline" /></div>
            ))}
            {topics?.topics.map((t) => (
              <div key={t.statement} className="card flex flex-col p-5">
                <span className="chip w-fit border-hairline text-body">{t.tag}</span>
                <p className="mt-3 flex-1 text-lg font-medium leading-6 tracking-tight">{t.statement}</p>
                <p className="mt-2 text-sm text-body">{t.blurb}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  {t.source ? (
                    <a href={t.source.url} target="_blank" rel="noreferrer" className="truncate text-xs text-mute underline underline-offset-2 hover:text-ink">{t.source.domain}</a>
                  ) : <span />}
                  <button className="btn-outline shrink-0" onClick={() => pickTopic(t.statement)}>Debate this</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 border-t border-hairline py-12 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <div className="font-mono text-xs text-mute">{s.n}</div>
              <h3 className="mt-3 text-base font-medium">{s.title}</h3>
              <p className="mt-1 text-sm leading-6 text-body">{s.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-mute">Built with TinyFish Search, Fetch, Browser and Agent.</div>
      </footer>
    </>
  );
}

/** Two dots, one per seat; filled = someone is in the room right now. */
function Presence({ online }: { online: number }) {
  return (
    <div className="flex shrink-0 flex-col items-center" title={`${online} of 2 players in the room`}>
      <div className="flex gap-1">
        {[0, 1].map((i) => <span key={i} className={`h-2.5 w-2.5 rounded-full border ${i < online ? "border-ok bg-ok" : "border-mute"}`} />)}
      </div>
      <span className="mt-1 font-mono text-xs tabular-nums text-body">{online}/2</span>
    </div>
  );
}
