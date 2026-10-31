# progress.md: Shared Progress Tracker

> **Agents:** read `agents.md`, then `plan.md`, then this file. Edit **only your member's section** and **append** to the log.
> Update this file after every task and **before you stop for any reason**. The next agent may only have this file to go on.

**Current phase:** Phase 3 (Integration & Polish)
**Last updated:** 13:36, Member A

---

## Checkpoints

| Checkpoint | Status | Verified by / time |
|---|---|---|
| 0: Setup | ✅ passed | A & B on main |
| 1: Core | ✅ passed | A (pipeline) & B (mock UI) on main |
| 2: Integration + Browser + Agent | ✅ passed | A (receipts/investigate) on main |
| 3: Complete game (2:30 freeze) | 🟨 in progress | A & B merged on main |
| 4: Demo ready | ⬜ | |

Legend: ⬜ not started · 🟨 in progress · ✅ passed · ❌ failed (see notes)

---

## Member A: Pipeline / Backend

**Branch:** `main` (merged from `a/p1-core`)
**Now working on:** Member A complete (all phases A0.1 - D4.4 passed)
**Half-done / where I stopped:** All Member A tasks completed, verified, and merged to main
**Blocked by:** —

- [x] A0.1 Scaffold Next.js
- [x] A0.2 Install deps + scripts
- [x] A0.3 `lib/types.ts` + `.env.example` on main
- [x] A0.4 `scripts/smoke.ts`
- [x] A1.1 `lib/tinyfish.ts` wrappers
- [x] A1.2 `lib/gemini.ts` + `lib/cache.ts`
- [x] A1.3 `lib/sources.ts` domain tiers
- [x] A1.4 `extract.ts`
- [x] A1.5 `verify.ts`
- [x] A1.6 `check.ts` + CLI
- [x] A2.1 `receipt.ts` (Browser)
- [x] A2.2 `lib/budget.ts`
- [x] A2.3 Portal map
- [x] A2.4 `investigate.ts` (Agent)
- [x] A3.1 Hardening
- [x] A3.2 AUTO_ESCALATE
- [x] A3.3 `/api/health`
- [x] D4.4 README

---

## Member B: Game / UI

**Branch:** `b/p3-status`
**Now working on:** B2.1: live test of `PIPELINE=real`. Blocked on API keys in `.env.local`
**Half-done / where I stopped:** B2.2/B2.3/B2.4/B3.1/B3.2 are built and tested against the mock only; they need a real receipt PNG and a real `streamingUrl` to be fully verified. B0.1 (Gemini key) not done by me.
**Blocked by:** nothing

- [ ] B0.1 Gemini key works
- [x] B0.2 Branch + dev server
- [x] B0.3 Demo script written (below)
- [x] B1.1 `lib/store.ts`
- [x] B1.2 `lib/pipeline/mock.ts`
- [x] B1.3 Room API routes
- [x] B1.4 `lib/scoring.ts`
- [x] B1.5 Landing page
- [x] B1.6 Room page + claim cards
- [ ] B2.1 Switch to real pipeline (A's code is on main and the switch works; keyless run degrades to `unverifiable` with no crash. NOT yet run with real keys)
- [x] B2.2 Receipts route + thumbnails
- [x] B2.3 Challenge button + route + scoring
- [x] B2.4 Investigator card (iframe + steps)
- [x] B3.1 Game end + winner screen
- [x] B3.2 Score event feed
- [x] B3.3 Empty/loading/error states (waiting, loading, room-not-found, global error + 404 pages, "connection lost" banner, stuck claims settled when the game ends)
- [ ] D4.3 Backup video

---

## TinyFish credits ledger ($16 start)

Log **every real Agent run** and the wallet balance at each checkpoint. Search and Fetch are free; you don't need to log them.

| Time | Member | What | Steps | Est. cost | Wallet balance after |
|---|---|---|---|---|---|
| start | — | — | — | — | $16.00 |

---

## Decisions (append; anything that changes plan.md or agents.md)

- [B] `next.config.ts`: turned off `cacheComponents`, `partialPrefetching` and `agentRules` (they fight the in-memory/polling design, and `agentRules` generated an `AGENTS.md` that collides with `agents.md` on Mac/Windows).
- [B] UI follows `DESIGN.md` (warm dark canvas, Inter + DM Mono, Instrument Serif italic accents, 3-4px radii, hairlines, no shadows). One deliberate exception: verdict chips use muted green/red/amber tints, because six verdicts can't be told apart in off-white alone.
- [B] Scoring: a turn's cited link earns +5 / −10 **once per turn**, not once per claim. **A: set `citedUrlCheck` on the claim(s) the link relates to; only the first one per turn is scored.**
- [B] One investigation per claim, keyed by `claimId`. `startChallenge` stores a queued placeholder immediately (reserves the challenge), and A's first `emit` replaces it. **A: `investigate()` must keep `claimId` on every emitted Investigation.**
- [B] A failed/skipped_budget investigation refunds the challenge. If the pipeline throws, the route settles the turn's claims as `unverifiable`.

- Stack: Next.js + TS + Tailwind, Gemini for the LLM, 2-tab polling, run locally (no Vercel).
- TinyAgent is used for Challenges (+ optional AUTO_ESCALATE), with a narrow portal map to keep step counts low.

---

## Demo script (B0.3)

**Topic:** "Nuclear power is safer than fossil fuels"

Facts below are from memory (OWID death rates per TWh, IAEA/WHO figures). **A: confirm the "Expected" column with `npm run check` once the pipeline works** and adjust the text if a verdict comes back different.

| Turn | Player | Argument | Planted? | Expected verdicts |
|---|---|---|---|---|
| 1 | P1 | "Nuclear is one of the safest energy sources. Coal causes roughly 24 deaths per terawatt-hour, while nuclear causes about 0.03. Nuclear also produces around 10% of the world's electricity." | | all `supported` |
| 2 | P2 | "Nuclear is not safe at all. Chernobyl killed over 1 million people within a year of the accident, and nuclear plants cause more deaths per terawatt-hour than coal." | ⚠️ both stats false → **P1 challenges the "more deaths than coal" claim** | Chernobyl 1M: `refuted`; nuclear > coal deaths: `refuted` (Investigator confirms via Our World in Data) |
| 3 | P1 | "France gets about 65-70% of its electricity from nuclear and has some of the lowest-carbon power in Europe. The Fukushima disaster in 2011 led to roughly 2,000 evacuation-related deaths, mostly among the elderly." | | France `supported`; Fukushima evacuation deaths `supported` or `misleading` |
| 4 | P2 | "Solar and wind are far cheaper than nuclear, and Germany shut down all its nuclear plants in April 2023. Nuclear waste stays dangerous for thousands of years." | | Germany shutdown `supported`; waste `supported`; "far cheaper" may be `misleading`/`unverifiable` |
| 5 | P1 | "Natural gas kills about 2.8 people per terawatt-hour, about a hundred times more than nuclear. Air pollution from fossil fuels causes millions of premature deaths every year." | | gas `supported`; air pollution `supported` |
| 6 | P2 | "I believe people will never trust nuclear. Still, the United States has more nuclear reactors than any other country." | | opinion ignored; US most reactors `supported` |

**Plan for the live demo:** turn 2 is the money moment. P1 clicks Challenge on the "more deaths than coal" claim, the Investigator opens Our World in Data on screen, both players watch it find the real number, and P2 loses points.

---

## Log (append only, newest at bottom)

Format: `HH:MM [A|B] did X · next: Y · notes`

- 13:14 [A] completed A0.1 - A0.4 (scaffold, deps, lib/types.ts, .env.example, scripts/smoke.ts) · next: Member B begins B0.1/B0.2, Member A begins Phase 1 (lib/tinyfish.ts) · pushed scaffold to main
- [B] did B0.3 demo script (nuclear vs fossil topic) · next: B0.2, then B1.x · DESIGN.md is the UI style guide (warm dark canvas, Inter/DM Mono, no accent colour)
- [B] did B0.2; disabled `cacheComponents`/`partialPrefetching`/`agentRules` in next.config.ts (shared file, A: pull main) · next: B1.x on b/p1-rooms
- [B] did B1.1-B1.6 + B2.2/2.3/2.4 + B3.1/3.2 against the mock pipeline (store, scoring, API routes, landing, room page, claim cards, Investigator card, winner screen). Tested a full 3-round game and a challenge in two real browsers · next: merge to main, then B2.1 once A's pipeline lands · `lib/pipeline/index.ts` is a mock-only stub: A, replace it when `check.ts`/`investigate.ts` exist (export real when `PIPELINE=real`)
- [B] did B3.3 · next: B2.1 once A's check.ts/investigate.ts are on main · note: game end now settles any still-running claims/investigations as unverifiable/failed
- 13:22 [A] completed A1.1 - A1.6 on branch a/p1-core (lib/tinyfish.ts, lib/gemini.ts, lib/cache.ts, lib/sources.ts, extract.ts, verify.ts, check.ts, scripts/check.ts) · tsc passed · degraded gracefully to unverifiable without keys · next: Phase 2 (receipt.ts, budget.ts, investigate.ts)
- 13:28 [A] completed A2.1 - A2.4 on branch a/p1-core (receipt.ts warm browser highlight/screenshot, budget.ts ledger guard, portal map indicators, investigate.ts TinyAgent live streaming + result extraction) · tsc passed · ready for Phase 3
- 13:33 [A] completed A3.1 - A3.3, D4.4 on branch a/p1-core (gemini concurrency limiter, AUTO_ESCALATE integration, /api/health endpoint, comprehensive README.md) · tsc passed · Member A tasks complete!
- 13:36 [A] merged a/p1-core into main · real pipeline and backend live on main!
- [B] verified A's merge on main: tsc passes, `PIPELINE=real` without keys → claim `unverifiable` + game continues, mock mode unchanged · next: B2.1 live run once `TINYFISH_API_KEY` and `GEMINI_API_KEY` are in `.env.local` · A: B2.1 stays unticked until a real run works
