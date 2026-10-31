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

**Branch:** `a/p1-core`
**Now working on:** Phase 1 complete (A1.1 - A1.6)
**Half-done / where I stopped:** Checkpoint 1 verification ready
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

**Branch:** `—`
**Now working on:** —
**Half-done / where I stopped:** —
**Blocked by:** —

- [ ] B0.1 Gemini key works
- [ ] B0.2 Branch + dev server
- [ ] B0.3 Demo script written (below)
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

**Topic:** _(fill in, e.g. "Nuclear power is safer than fossil fuels")_

| Turn | Player | Argument | Planted? | Expected verdicts |
|---|---|---|---|---|
| 1 | P1 | | | |
| 2 | P2 | | ⚠️ false stat → P1 challenges it | |
| 3 | P1 | | | |
| 4 | P2 | | | |
| 5 | P1 | | | |
| 6 | P2 | | | |

---

## Log (append only, newest at bottom)

Format: `HH:MM [A|B] did X · next: Y · notes`

- 13:14 [A] completed A0.1 - A0.4 (scaffold, deps, lib/types.ts, .env.example, scripts/smoke.ts) · next: Member B begins B0.1/B0.2, Member A begins Phase 1 (lib/tinyfish.ts) · pushed scaffold to main
- 13:22 [A] completed A1.1 - A1.6 on branch a/p1-core (lib/tinyfish.ts, lib/gemini.ts, lib/cache.ts, lib/sources.ts, extract.ts, verify.ts, check.ts, scripts/check.ts) · tsc passed · degraded gracefully to unverifiable without keys · next: Phase 2 (receipt.ts, budget.ts, investigate.ts)
