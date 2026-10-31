# progress.md: Shared Progress Tracker

> **Agents:** read `agents.md`, then `plan.md`, then this file. Edit **only your member's section** and **append** to the log.
> Update this file after every task and **before you stop for any reason**. The next agent may only have this file to go on.

**Current phase:** Phase 0 (Setup)
**Last updated:** (time, member)

---

## Checkpoints

| Checkpoint | Status | Verified by / time |
|---|---|---|
| 0: Setup | ⬜ not started | |
| 1: Core | ⬜ | |
| 2: Integration + Browser + Agent | ⬜ | |
| 3: Complete game (2:30 freeze) | ⬜ | |
| 4: Demo ready | ⬜ | |

Legend: ⬜ not started · 🟨 in progress · ✅ passed · ❌ failed (see notes)

---

## Member A: Pipeline / Backend

**Branch:** `main`
**Now working on:** Phase 0 complete; pushing scaffold for Member B
**Half-done / where I stopped:** Checkpoint 0 reached
**Blocked by:** —

- [x] A0.1 Scaffold Next.js
- [x] A0.2 Install deps + scripts
- [x] A0.3 `lib/types.ts` + `.env.example` on main
- [x] A0.4 `scripts/smoke.ts`
- [ ] A1.1 `lib/tinyfish.ts` wrappers
- [ ] A1.2 `lib/gemini.ts` + `lib/cache.ts`
- [ ] A1.3 `lib/sources.ts` domain tiers
- [ ] A1.4 `extract.ts`
- [ ] A1.5 `verify.ts`
- [ ] A1.6 `check.ts` + CLI
- [ ] A2.1 `receipt.ts` (Browser)
- [ ] A2.2 `lib/budget.ts`
- [ ] A2.3 Portal map
- [ ] A2.4 `investigate.ts` (Agent)
- [ ] A3.1 Hardening
- [ ] A3.2 AUTO_ESCALATE
- [ ] A3.3 `/api/health`
- [ ] D4.4 README

---

## Member B: Game / UI

**Branch:** `b/p0-demo-script`
**Now working on:** B0.2 (pull scaffold, check dev server), then B1.x
**Half-done / where I stopped:** demo script done; `DESIGN.md` (UI style guide) added by the human
**Blocked by:** —

- [ ] B0.1 Gemini key works
- [ ] B0.2 Branch + dev server
- [x] B0.3 Demo script written (below)
- [ ] B1.1 `lib/store.ts`
- [ ] B1.2 `lib/pipeline/mock.ts`
- [ ] B1.3 Room API routes
- [ ] B1.4 `lib/scoring.ts`
- [ ] B1.5 Landing page
- [ ] B1.6 Room page + claim cards
- [ ] B2.1 Switch to real pipeline
- [ ] B2.2 Receipts route + thumbnails
- [ ] B2.3 Challenge button + route + scoring
- [ ] B2.4 Investigator card (iframe + steps)
- [ ] B3.1 Game end + winner screen
- [ ] B3.2 Score event feed
- [ ] B3.3 Empty/loading/error states
- [ ] D4.3 Backup video

---

## TinyFish credits ledger ($16 start)

Log **every real Agent run** and the wallet balance at each checkpoint. Search and Fetch are free; you don't need to log them.

| Time | Member | What | Steps | Est. cost | Wallet balance after |
|---|---|---|---|---|---|
| start | — | — | — | — | $16.00 |

---

## Decisions (append; anything that changes plan.md or agents.md)

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
