"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { post, saveSeat } from "@/lib/client";

const PRESETS = [
  "Nuclear power is safer than fossil fuels",
  "Remote work is better for productivity than the office",
  "Social media has done more harm than good",
];

const STEPS = [
  { n: "01", title: "Make your case", body: "Two players, three rounds each, 90 seconds a turn. Say what you believe and back it with facts." },
  { n: "02", title: "Every fact gets checked", body: "We search credible sources, read them, and show a screenshot of the proof. True claims earn points. Made-up ones cost you." },
  { n: "03", title: "Challenge a claim", body: "Doubt a number? Send the Investigator, a robot that browses a real data portal while you both watch." },
];

export default function Landing() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState(PRESETS[0]);
  const [custom, setCustom] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chosen = custom.trim() || topic;

  async function create() {
    setBusy(true); setError("");
    const { ok, data } = await post<{ code: string }>("/api/rooms", { topic: chosen, name });
    setBusy(false);
    if (!ok) return setError(data.error ?? "Could not create the room");
    saveSeat(data.code, { slot: "p1", name: name.trim() || "Player 1" });
    router.push(`/room/${data.code}`);
  }

  function join() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) return setError("Room codes are 4 letters");
    // The room page handles the actual seat claim (so shared links work the same way).
    if (name.trim()) sessionStorage.setItem("narad:pendingName", name.trim());
    router.push(`/room/${code}`);
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
        <section className="py-20 sm:py-24">
          <h1 className="max-w-3xl text-5xl font-normal leading-[1.1] tracking-[-0.025em] sm:text-6xl">
            Win the argument by being <em className="font-serif text-[1.1em] font-normal italic">right.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-7 text-body">
            A 1v1 debate where a robot fact-checks every claim as you make it, and shows its receipts.
          </p>
        </section>

        <section className="grid gap-4 pb-16 lg:grid-cols-[3fr_2fr]">
          <div className="card p-6">
            <h2 className="text-2xl font-medium tracking-tight">Start a debate</h2>
            <label className="eyebrow mt-5 block">Your name</label>
            <input className="input mt-1" placeholder="Ann" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />

            <label className="eyebrow mt-5 block">Topic</label>
            <div className="mt-1 divide-y divide-hairline rounded-sm border border-hairline">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setTopic(p); setCustom(""); }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-canvas ${!custom.trim() && topic === p ? "text-ink" : "text-body"}`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full border ${!custom.trim() && topic === p ? "border-primary bg-primary" : "border-mute"}`} />
                  {p}
                </button>
              ))}
            </div>
            <input className="input mt-2" placeholder="…or type your own topic" maxLength={200} value={custom} onChange={(e) => setCustom(e.target.value)} />

            <button className="btn-primary mt-6" onClick={create} disabled={busy}>
              {busy ? "Creating…" : "Create room"}
            </button>
          </div>

          <div className="card self-start p-6">
            <h2 className="text-2xl font-medium tracking-tight">Join a friend</h2>
            <p className="mt-1 text-sm text-body">Got a room code? Type it here.</p>
            <input
              className="input mt-4 text-center font-mono text-2xl uppercase tracking-[0.4em]"
              placeholder="ABCD" maxLength={4}
              value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
            />
            <button className="btn-outline mt-3 w-full" onClick={join}>Join room</button>
            <p className="mt-3 text-xs text-mute">Uses the name you typed on the left.</p>
          </div>
        </section>
        {error && <p className="-mt-10 pb-10 text-sm text-bad">{error}</p>}

        <section className="grid gap-4 border-t border-hairline py-16 md:grid-cols-3">
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
