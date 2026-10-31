# plan.md: Implementation Plan (3 hours)

Task IDs (e.g. `A1.3`) are referenced in `progress.md`. Do the phases in order. **Do not start the next phase until both members tick
every box of the current checkpoint.** If a checkpoint fails, fix it or cut scope (see "Cut list"); don't skip ahead.

**Member A = pipeline/backend** (TinyFish + Gemini). **Member B = game/UI** (rooms, scoring, everything you see).

---

## Phase 0: Setup (0:00 → 0:20)

| ID | Owner | Task |
|---|---|---|
| A0.1 | A | Scaffold: `npx create-next-app@latest web --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes`, then `cp -r web/. . && rm -rf web` (delete `web/.git` if created). Add `.cache/` and `.env.local` to `.gitignore` |
| A0.2 | A | `npm i @tiny-fish/sdk @google/genai playwright-core nanoid` and `npm i -D tsx`. Add scripts `smoke`, `check` (via `tsx`) |
| A0.3 | A | Commit `lib/types.ts` exactly as in agents.md §4, plus `.env.example`. **Push to `main`** so B can start |
| A0.4 | A | `scripts/smoke.ts`: 1 search, 1 fetch, create+delete 1 browser session, print wallet balance; with `--agent`, 1 tiny agent run (`max_duration_seconds: 60`) on an Our World in Data page |
| B0.1 | B | Get a Gemini API key and confirm one JSON-mode call works (a 5-line script is fine) |
| B0.2 | B | After A0.3: pull, create branch `b/p1-rooms`, check `npm run dev` boots |
| B0.3 | B | Write the **demo script** (topic + 6 scripted arguments, including the planted false claims) into `progress.md` → "Demo script" |

**✅ Checkpoint 0**
- [ ] `npm run dev` boots on both laptops from `main`
- [ ] `npm run smoke` passes Search, Fetch, Browser, Gemini
- [ ] `npm run smoke -- --agent` succeeded **once**: cost and wallet balance written to the credits ledger
- [ ] `lib/types.ts` is on `main`

---

## Phase 1: Core, built in parallel (0:20 → 1:15)

| ID | Owner | Task |
|---|---|---|
| A1.1 | A | `lib/tinyfish.ts`: wrappers `search()`, `fetchPages()` with timeouts (10s / 30s) that return `[]` on error |
| A1.2 | A | `lib/gemini.ts`: `json<T>(prompt, schema)` with retry on 429. `lib/cache.ts`: disk cache keyed by sha1 |
| A1.3 | A | `lib/sources.ts`: domain tiers (1: .gov, who.int, un.org, worldbank.org, ourworldindata.org, nature.com, reuters.com, apnews.com, bbc.com; 2: wikipedia.org, major newspapers; 3: everything else) |
| A1.4 | A | `extract.ts`: argument → ≤4 claims `{text, kind}` (opinions tagged, not checked) |
| A1.5 | A | `verify.ts`: claim → search (include_domains = tier 1 first, fallback unrestricted if <2 results) → fetch top 2-3 → Gemini verdict `{verdict, confidence, relevance, explanation, evidence[{url, quote}]}`. Also checks `citedUrl` if given |
| A1.6 | A | `check.ts`: orchestrates; verifies claims in parallel; calls `emit` at every status change. `scripts/check.ts` CLI |
| B1.1 | B | `lib/store.ts`: rooms on `globalThis`, `createRoom`, `joinRoom`, `getRoom`, `mutate(code, fn)` (bumps `version`) |
| B1.2 | B | `lib/pipeline/mock.ts`: fake `checkTurn` / `investigate` with delays and a mix of verdicts. `lib/pipeline/index.ts` switch (A owns the final version; B writes a first stub) |
| B1.3 | B | API routes: create, join, get, turn (kicks off `checkTurn`, `emit` → store → rescore) |
| B1.4 | B | `lib/scoring.ts`: `scoreRoom(room)` recomputes all claim points + player scores from scratch (agents.md §7) |
| B1.5 | B | Landing page (topic picker with 3 preset topics + custom, create/join). Seat saved in `sessionStorage["narad:<code>"]` (per tab, so 2 tabs of one browser = 2 players) |
| B1.6 | B | Room page: poll every 1.5s, scoreboard, whose turn, 90s timer, 600-char argument box (+ optional cite URL), turn history, **claim cards** colored by verdict with status spinner, evidence link, explanation, points |

**✅ Checkpoint 1**
- [ ] A: `npm run check -- "<demo argument with planted false claim>"` → true claims `supported`, planted claim `refuted`, total < 30s
- [ ] A: killing the network or using a bad key → claims come back `unverifiable`, no crash
- [ ] B: two tabs, create + join, take 6 turns with `PIPELINE=mock`; claims appear and animate; scores update in both tabs
- [ ] Both branches rebased on `main`, `npx tsc --noEmit` passes, merged to `main`

---

## Phase 2: Integration + Browser + Agent (1:15 → 2:00)

| ID | Owner | Task |
|---|---|---|
| A2.1 | A | `receipt.ts`: warm Browser session on `globalThis` (`timeout_seconds: 300`), `connectOverCDP`, new page → goto evidence URL → find the quote's text node → wrap in `<mark>` → `scrollIntoView` → viewport screenshot → `.cache/receipts/<id>.png`. 15s timeout; failure = no receipt. Hook it into `check.ts` for supported/refuted claims (status `receipt`) |
| A2.2 | A | `lib/budget.ts`: `canRunAgent()`, `recordAgentRun(runId, steps)`, persisted in `.cache/budget.json`, enforces `AGENT_RUN_LIMIT` |
| A2.3 | A | `sources.ts` portal map: energy/climate → ourworldindata.org, economy → data.worldbank.org, health → who.int/data, fallback → en.wikipedia.org. Gemini picks the category + writes a narrow goal |
| A2.4 | A | `investigate.ts`: budget check → cache check → `agent.stream` with `max_duration_seconds: 90` → `emit` on `STREAMING_URL` and each `PROGRESS` → parse `COMPLETE` JSON `{found, value, source_url, verdict, explanation}` → cache result |
| B2.1 | B | Switch to `PIPELINE=real`, fix whatever breaks in the integration |
| B2.2 | B | `/api/receipts/[id]` route + receipt thumbnail on claim card (click → full size modal) |
| B2.3 | B | Challenge button on opponent claims (shows `challengesLeft`) + `challenge` API route + scoring for challenges |
| B2.4 | B | **Investigator card**: `<iframe src={streamingUrl}>` (16:9, read-only) + live step list + final result banner. States: queued / running / done / failed / skipped_budget |

**✅ Checkpoint 2**
- [ ] A real turn from the browser: claims go searching → judging → receipt → done, and the receipt image shows in the card
- [ ] One real challenge: the iframe shows the live agent, steps stream in, the result re-scores both players
- [ ] Repeating the same challenge hits the cache (status `cached`, $0)
- [ ] Credits ledger updated; wallet balance still ≥ $10
- [ ] Merged to `main`

---

## Phase 3: Complete game + hardening (2:00 → 2:30)

| ID | Owner | Task |
|---|---|---|
| A3.1 | A | Timeouts + try/catch audit on every external call; Gemini 429 backoff; browser session auto-recreate |
| A3.2 | A | `AUTO_ESCALATE` (max 1 auto-investigation per turn, numeric claims only) |
| A3.3 | A | `/api/health`: TinyFish + Gemini status + agent runs used/left |
| B3.1 | B | Game end: `finishing` (wait for pending work, 60s max) → `finished` → winner screen with every claim + verdict + receipt |
| B3.2 | B | Live score event feed ("−15 P2: refuted claim"), score-change animations |
| B3.3 | B | Empty, loading and error states; waiting-for-opponent screen with a copyable room code |

**✅ Checkpoint 3**
- [ ] Two full 3-round games played end to end without a crash (one mock, one real)
- [ ] App survives a TinyFish/Gemini failure mid-game (claims → unverifiable, game continues)
- [ ] Merged to `main`. **2:30 = FEATURE FREEZE**

---

## Phase 4: Demo prep (2:30 → 3:00), both members

| ID | Owner | Task |
|---|---|---|
| D4.1 | A+B | Play the demo script once with `PIPELINE=real` and `DEMO_CACHE=true` → all checks and the agent run get cached |
| D4.2 | A+B | Rehearse twice from cache (costs $0); time it under 3 minutes |
| D4.3 | B | Screen-record one full run as a backup video |
| D4.4 | A | README: setup, env vars, run commands, how each TinyFish product is used |

**✅ Checkpoint 4**
- [ ] Demo runs from cache in < 3 min · backup video saved · README done · final balance written to the ledger

---

## Budget plan ($16 TinyFish)

| Bucket | Max agent runs | Est. cost |
|---|---|---|
| Phase 0 smoke | 1 | ~$0.30 |
| Phase 2 development | 8 | ~$3.00 |
| Phase 3 testing | 4 | ~$1.50 |
| Demo warm-up + live demo | 4 | ~$1.50 |
| Browser sessions (whole event) | n/a | < $0.50 |
| **Reserve (don't touch)** | n/a | **~$9** |

A narrow agent goal ≈ 10-25 steps ≈ $0.16-$0.40. `max_duration_seconds: 90` caps the worst case. `AGENT_RUN_LIMIT=20` is the hard stop.
**If the balance drops below $6:** set `AGENT_RUN_LIMIT` to the current count + 3 and use only cached runs except in the live demo.

---

## Git workflow

- **`main` is always runnable.** Never force-push `main`. Never commit `.env.local` or `.cache/`.
- **Branches:** `a/<phase>-<topic>` and `b/<phase>-<topic>`, e.g. `a/p1-pipeline`, `b/p2-investigator`. One branch per phase per member.
- **Commits:** small and frequent, prefixed with the member: `[A] feat(pipeline): claim extraction`, `[B] fix(room): polling race`.
  Commit `progress.md` along with the work it describes.
- **Merging (at every checkpoint, and whenever something useful works):**
  ```
  git fetch origin && git rebase origin/main
  npx tsc --noEmit && npm run dev   # must boot
  git push -u origin <branch>
  gh pr create --fill && gh pr merge --squash --delete-branch
  ```
  Self-merge is fine once the checks pass. Tell your partner "merged X", and they rebase.
- **Shared files:**
  - `lib/types.ts`: change only in a dedicated commit `[A|B] contract: <what>`, merged to `main` right away; tell your partner.
  - `package.json` / lockfile: whoever adds a dep commits both. On a lockfile conflict: take `origin/main`'s version, re-run `npm install`, commit.
  - `progress.md`: edit **only your own section** and **append** to the log. That avoids merge conflicts.
- **Stuck on a conflict for > 5 min?** Ask your partner and resolve it together; don't guess on their files.

---

## Cut list (if behind schedule, cut from the top)

1. `AUTO_ESCALATE` (A3.2)
2. Cited-URL bonus/penalty
3. Score event feed animations (B3.2)
4. Receipt highlight: fall back to a plain screenshot of the page top
5. Investigator iframe: fall back to the step list only

**Never cut:** claim checking with verdicts, scoring, one working challenge with the Agent, the cached demo.
