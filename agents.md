# agents.md: Read This First

You are a coding agent working on **Narad**, a hackathon project (2 humans, 3 hours, $16 TinyFish budget).
Read this whole file before doing anything. Then read `plan.md` (what to build, in what order) and `progress.md` (what's done).

---

## 0. Rules for every agent (non-negotiable)

1. **Find out who you work for.** There are two members: **Member A** (pipeline/backend) and **Member B** (UI/game/rooms).
   Check the git branch prefix (`a/...` or `b/...`). If unclear, **ask the human** before writing code.
2. **Stay in your lane.** Only edit files owned by your member (see §5). If you must touch the other member's files or
   a shared contract (`lib/types.ts`, `package.json`), make a small separate commit and tell the human so they can notify their partner.
3. **Update `progress.md`** after every finished task, and **before you stop for any reason** (task done, blocked,
   running out of context). Edit only your member's section, plus append to the log at the bottom. Another agent may take over from you
   with nothing but `progress.md`, so write down exactly where you stopped and what's half-done.
4. **Protect the TinyFish budget ($16 total, shared by both members).**
   - Search and Fetch are **free**. Use them freely (they still have rate limits).
   - **Agent = $0.016 per step** (an uncapped run can cost $2+). **Never** call the Agent API in a loop, in tests,
     or "just to check". Every real agent run goes through `lib/budget.ts` and must be logged in the credits ledger in `progress.md`.
   - **Browser = $0.002/min.** Cheap, but always set `timeout_seconds` and reuse the single warm session.
   - Develop UI with `PIPELINE=mock`. Develop the agent with cached fixtures once one real run has succeeded.
5. **Never commit secrets.** Keys live in `.env.local` (gitignored). `.cache/` is gitignored.
6. **`main` must always run.** Before merging: `npx tsc --noEmit` passes and `npm run dev` boots. See git workflow in `plan.md`.
7. **Don't gold-plate.** No auth, no database, no deployment, no ELO, no matchmaking. If a feature isn't in `plan.md`, ask first.

---

## 1. What we're building (one paragraph)

A web app where two players debate a topic 1v1 in two browser tabs. Each argument is split into factual claims by Gemini.
Each claim is checked live: **TinySearch** finds sources, **TinyFetch** reads them, Gemini gives a verdict
(supported / refuted / misleading / unverifiable), and **TinyBrowser** takes a highlighted screenshot of the source quote
(the "receipt"). Players can spend a **Challenge** on an opponent's claim. **TinyAgent**, "the Investigator", then navigates
an interactive data portal (Our World in Data, World Bank…) to dig out the real number, and both players
watch it live in an iframe. Points are won and lost per claim; highest score after 3 rounds each wins.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| App | **Next.js (App Router) + TypeScript + Tailwind**, a single repo for both frontend and API routes |
| LLM | **Gemini** via `@google/genai`, JSON mode (`responseMimeType: "application/json"` + `responseSchema`). Model from `GEMINI_MODEL` env (verify the current model name in Google AI Studio) |
| Web | **TinyFish** via `@tiny-fish/sdk` (reads `TINYFISH_API_KEY` automatically) |
| Browser control | `playwright-core` → `chromium.connectOverCDP(cdp_url)` (no local browser download needed) |
| Multiplayer | In-memory room store on `globalThis` + clients **poll** `GET /api/rooms/[code]` every 1.5s |
| Run mode | **Local Node server only** (`npm run dev` or `npm run build && npm start`). Do **not** deploy to Vercel: serverless loses in-memory rooms and kills background work. A second laptop can join over LAN via `http://<your-ip>:3000` |

---

## 3. Architecture

```
 Tab P1 ──poll 1.5s──┐                          ┌── lib/pipeline/check.ts ── per claim, in parallel:
 Tab P2 ──poll 1.5s──┤                          │      1. Gemini: extract claims (1 call per turn, max 4 claims)
                     ▼                          │      2. TinySearch (credible domains first, fallback unrestricted)
          app/api/rooms/[code]/*  ──kick off──► │      3. TinyFetch top 2-3 URLs → relevant passage
                     │      (not awaited)       │      4. Gemini: verdict + quote + relevance
                     ▼                          │      5. TinyBrowser: highlight quote → screenshot (receipt)
          lib/store.ts (in-memory Room)  ◄─emit─┤
                     ▲                          └── lib/pipeline/investigate.ts (on Challenge):
                     │                                 TinyAgent /run-sse on a portal → streaming_url + PROGRESS
          lib/scoring.ts (pure functions)                 steps → structured result → re-score claim
```

**The key interface between A and B:** pipeline functions take an `emit` callback. A's code calls `emit(updatedClaim)`
whenever a claim changes status. B's API route passes an `emit` that writes into the room store and re-scores.
That is how live progress reaches the UI with only polling.

```ts
// Member A provides (lib/pipeline/check.ts, lib/pipeline/investigate.ts):
checkTurn(input: CheckInput, emit: (c: Claim) => void): Promise<Claim[]>
investigate(claim: Claim, requestedBy: PlayerSlot | "auto", emit: (i: Investigation) => void): Promise<Investigation>

// Member B provides (lib/pipeline/mock.ts) the same signatures with fake data + setTimeout delays,
// so the UI can be built before A's pipeline exists. Switch with env PIPELINE=mock|real.
```

---

## 4. Data contracts: `lib/types.ts` (shared; change only via a dedicated commit)

```ts
export type PlayerSlot = "p1" | "p2";
export type Stance = "for" | "against";
export type Verdict = "pending" | "supported" | "refuted" | "misleading" | "unverifiable" | "opinion";
export type ClaimStatus = "queued" | "searching" | "fetching" | "judging" | "receipt" | "done" | "error";

export interface Evidence { url: string; title: string; domain: string; quote: string; tier: 1 | 2 | 3 }

export interface Claim {
  id: string; turnId: string; player: PlayerSlot;
  text: string; kind: "factual" | "opinion";
  status: ClaimStatus; verdict: Verdict;
  confidence: number;          // 0..1
  relevance: number;           // 0.5..1, multiplier on points
  explanation: string;         // one short sentence for the card
  evidence: Evidence[];
  receiptId?: string;          // image served at /api/receipts/[receiptId]
  citedUrl?: string;
  citedUrlCheck?: "matches" | "misrepresented" | "unreadable";
  investigationId?: string;
  points: number;              // computed by lib/scoring.ts, never by the pipeline
}

export interface Investigation {
  id: string; claimId: string; requestedBy: PlayerSlot | "auto";
  status: "queued" | "running" | "done" | "failed" | "skipped_budget" | "cached";
  portalUrl: string; goal: string;
  streamingUrl?: string;       // embed in <iframe>, read-only
  steps: string[];             // human-readable PROGRESS lines
  result?: { verdict: Verdict; foundValue?: string; sourceUrl?: string; explanation: string };
}

export interface Turn {
  id: string; player: PlayerSlot; round: number; text: string; citedUrl?: string; submittedAt: number;
  judged?: boolean; offTopic?: boolean; wrongSide?: boolean; judgeNote?: string;   // set by lib/judge.ts
}
export interface Player { slot: PlayerSlot; name: string; stance: Stance; score: number; challengesLeft: number }
export interface ScoreEvent { id: string; at: number; player: PlayerSlot; delta: number; reason: string; claimId?: string }

export interface Room {
  code: string; topic: string;
  status: "waiting" | "active" | "finishing" | "finished";
  players: Partial<Record<PlayerSlot, Player>>;
  currentPlayer: PlayerSlot; round: number; maxRounds: number;   // chosen by the creator, 3..20 (default 3): each player gets this many turns
  turnSeconds: number;                                             // chosen by the room creator, 30..120 (default 90)
  turnDeadline: number;                                            // epoch ms, turnSeconds after the turn started (UI-enforced)
  isPublic: boolean;                                               // listed on the home page lobby
  turns: Turn[]; claims: Claim[]; investigations: Investigation[];
  events: ScoreEvent[];
  version: number;                                                 // ++ on every mutation
}

export interface CheckInput { topic: string; turn: Turn; opponentLastTurn?: string; stance?: Stance }
```

---

## 5. File layout & ownership

```
app/
  page.tsx                          B  landing: pick topic, create room / join by code
  room/[code]/page.tsx              B  debate room (polling, argument box, timer, claims, scoreboard)
  api/rooms/route.ts                B  POST create room → {code, slot:"p1"}
  api/rooms/[code]/route.ts         B  GET room state (polled)
  api/rooms/[code]/join/route.ts    B  POST join → {slot:"p2"}
  api/rooms/[code]/turn/route.ts    B  POST argument → store turn, advance turn, kick off checkTurn (not awaited)
  api/rooms/[code]/challenge/route.ts B POST {claimId, by} → kick off investigate (not awaited)
  api/receipts/[id]/route.ts        B  serves .cache/receipts/[id].png (public/ isn't served for runtime files)
  api/health/route.ts               A  pings TinyFish + Gemini, returns budget status
components/*                        B
lib/types.ts                        A+B shared contract
lib/store.ts                        B  rooms Map on globalThis, mutation helpers that bump version
lib/scoring.ts                      B  pure scoring functions (§7)
lib/pipeline/mock.ts                B  fake checkTurn/investigate
lib/pipeline/index.ts               A  exports real or mock based on PIPELINE env
lib/pipeline/extract.ts             A  Gemini claim extraction
lib/pipeline/verify.ts              A  search → fetch → Gemini verdict for one claim
lib/pipeline/receipt.ts             A  TinyBrowser highlight + screenshot
lib/pipeline/check.ts               A  orchestrates a turn
lib/pipeline/investigate.ts         A  TinyAgent Investigator
lib/tinyfish.ts                     A  thin SDK wrappers with timeouts
lib/gemini.ts                       A  JSON-mode helper
lib/budget.ts                       A  agent-run guard + ledger file .cache/budget.json
lib/cache.ts                        A  disk cache .cache/<kind>/<sha1>.json
lib/sources.ts                      A  credible domain tiers + portal map
scripts/smoke.ts                    A  Phase 0 connectivity test
scripts/check.ts                    A  CLI: npm run check -- "argument text"
```

---

## 6. TinyFish cheat sheet (verified against docs.tinyfish.ai, Oct 2026)

Auth: header `X-API-Key: $TINYFISH_API_KEY` (the SDK does this). Full docs: https://docs.tinyfish.ai/llms-full.txt

| Product | SDK (TS) | Raw endpoint | Latency | Cost |
|---|---|---|---|---|
| Search | `client.search.query({query, location, language})` | `GET https://api.search.tinyfish.ai?query=...` | 1-3s | free |
| Fetch | `client.fetch.getContents({urls:[...]})` (≤10 URLs) | `POST https://api.fetch.tinyfish.ai` | 1-20s | free |
| Browser | `client.browser.sessions.create({url, timeout_seconds})` → `{session_id, cdp_url, base_url}` | `POST https://api.browser.tinyfish.ai`, `DELETE .../{session_id}` | create 10-30s | $0.002/min |
| Agent | `client.agent.stream({url, goal, agent_config})` | `POST https://agent.tinyfish.ai/v1/automation/run-sse` | 15-60s+ | **$0.016/step** |
| Wallet | n/a | `GET https://agent.tinyfish.ai/v1/wallet` | | |

- Search options: `domain_type: "web"|"news"|"research_paper"`, `include_domains`, `exclude_domains`, `recency_minutes`, `after_date`.
- Agent SSE events: `STARTED` (run_id), `STREAMING_URL` (iframe-able live view, safe to send to the browser),
  `PROGRESS` (`purpose` = what it's doing), `HEARTBEAT`, `COMPLETE` (`status`, `result`).
- **Always** pass `agent_config: { max_duration_seconds: 90 }` (and `max_steps: 30` if the beta accepts it). This caps cost.
- `COMPLETED` status ≠ success: check the result for "captcha", "blocked", "not found".
- Ask the agent for **JSON with explicit fields**; vague goals fail. Narrow URL (a specific grapher/indicator page) = fewer steps = cheaper.
- Browser session creation is slow (10-30s): keep **one warm session** on `globalThis`, open a new page per receipt, recreate on error.
- Never run `connectOverCDP` from the client. All TinyFish calls are server-side only; the API key never reaches the browser.

---

## 7. Game & scoring rules (implemented in `lib/scoring.ts`)

| Event | Points |
|---|---|
| Supported claim | **+10** for the first 3 supported in a turn, **+3** after that |
| Refuted claim | **−15** |
| Misleading | **−5** |
| Unverifiable / opinion | 0 |
| Unverifiable **factual claim with a specific number** (digits or "million" etc., bare years excluded) that no source backed up, and the checker really ran (`confidence > 0`) | **−5** ("unsupported statistic"); a successful Challenge that finds the real figure overrides it |
| Cited URL backs the claim (`citedUrlCheck: "matches"`) | **+5** |
| Cited URL misrepresented | **−10** |
| Challenge succeeds (investigation verdict refuted/misleading) | challenger **+10**; the claim is re-scored with the new verdict |
| Challenge fails (investigation says supported) | challenger **−5** |
| Relevance | multiply the claim's base points by `relevance` (0.5..1), round to integer |
| Argument strays from the motion (`Turn.offTopic`) | **−20**, once per turn. If the whole turn is off-topic its claims are not fact-checked |
| Argument clearly argues the player's own opposite stance (`Turn.wrongSide`) | **−5**, once per turn (not applied on top of off-topic) |

- Creator picks the number of rounds (3-20, default 3) and their stance (For/Against); the joiner gets the other stance. Creator speaks first. Alternating p1 → p2. Turn length is set by the room creator (30-120s, default 90). UI timer; on 0 the textbox auto-submits whatever is there.
- Max 600 chars per argument, max 4 checkable claims extracted per turn.
- 2 challenges per player per game. A challenge can target any opponent claim whose verdict isn't `pending`.
- Game ends after the last turn **and** after all checks/investigations finish (or 60s grace, whichever is first).
- Scores are always **recomputed from claims + challenges** (not incrementally mutated) so re-scoring is safe.

---

## 8. Env vars (`.env.example` is committed, `.env.local` is not)

```
TINYFISH_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite   # fast + reliable; gemini-3.5-flash-lite is closed to new keys, 3.8-flash was overloaded
PIPELINE=mock                     # mock | real
AGENT_RUN_LIMIT=20                # hard cap on real TinyAgent runs (lib/budget.ts refuses beyond)
AUTO_ESCALATE=false               # if true, unverifiable numeric claims auto-trigger the Investigator
DEMO_CACHE=true                   # serve cached pipeline/agent results when the same claim repeats
```

---

## 9. Commands

```
npm run dev              # app on :3000
npx tsc --noEmit         # typecheck, required before merge
npm run smoke            # Phase 0: tests Search, Fetch, Browser, Gemini, wallet (+1 tiny Agent run with --agent)
npm run check -- "text"  # run the real pipeline on an argument from the CLI and print claims JSON
```

---

## 10. Gotchas we already know

- `create-next-app .` refuses a non-empty folder: scaffold into `./web`, then move the files up (see plan.md Phase 0).
- Files written to `public/` at runtime aren't served by `next start`. Serve receipts via `/api/receipts/[id]`.
- In dev, Next hot-reload re-imports modules. Keep the room store, browser session and budget counter on `globalThis`.
- Gemini free tier has per-minute limits. 1 extraction call per turn plus ≤4 verdict calls; add retry with backoff on 429.
- Fire-and-forget in route handlers: `void checkTurn(...).catch(log)`. Never `await` the pipeline inside the POST.
- Everything that can fail (search, fetch, browser, agent, Gemini) must degrade to `verdict: "unverifiable"` or "no receipt",
  never crash the room.
