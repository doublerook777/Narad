# Narad

**Say it. Prove it.**

Narad is a 1v1 debate arena where every factual claim is fact-checked while you play. Two players argue a motion, one For and one Against. Each argument is split into claims, each claim is checked against real sources, and the verdict, with a screenshot of the source, appears on the claim card within seconds. Points go to the player whose facts hold up.

Debates are usually won by whoever sounds most sure. Narad makes the truth the winning move.

## How a game works

1. **Create or join a room.** Pick a motion (or one of the "Hot right now" topics drawn from the news), choose For or Against, the number of rounds (3 to 20) and the turn time (30 to 120 seconds). Rooms can be public, listed in the lobby with live player counts, or private and joined by code.
2. **Argue.** Players alternate turns. Each argument is up to 600 characters and can cite a URL.
3. **Watch the checks land.** Every factual claim gets a verdict (supported, refuted, misleading, unverifiable) with quoted evidence from tiered sources and a highlighted screenshot of the page it came from, the receipt.
4. **Challenge.** Each player has two challenges. Spend one on an opponent's claim and the Investigator, a browser agent, opens a public data portal such as Our World in Data, finds the real figure and re-scores the claim. Both players watch it work in a live embedded view.
5. **Win on points.** The highest score after the last turn wins.

### Scoring

| Event | Points |
| :--- | :---: |
| Supported claim | +10 (first three per turn, +3 after that) |
| Refuted claim | −15 |
| Misleading claim | −5 |
| Unverifiable claim or opinion | 0 |
| Specific number that no source backed up | −5 |
| Cited URL backs the claim | +5 |
| Cited URL misrepresents the claim | −10 |
| Challenge succeeds | +10 for the challenger, claim re-scored |
| Challenge fails | −5 for the challenger |
| Argument strays from the motion | −20 per turn |
| Argument defends the opposite side | −5 per turn |

Each claim's points are scaled by its relevance to the motion (0.5 to 1). Scores are always recomputed from the claims and challenges, so a re-score can never drift.

## How it works

```
 Player 1 ──poll──┐                       ┌── lib/pipeline/check.ts, per claim in parallel:
 Player 2 ──poll──┤                       │     1. Gemini splits the argument into claims
                  ▼                       │     2. TinyFish Search finds sources (credible domains first)
        app/api/rooms/[code]/*  ─────────►│     3. TinyFish Fetch reads the best pages
                  │   (not awaited)       │     4. Gemini returns a verdict and a verbatim quote
                  ▼                       │     5. TinyFish Browser highlights the quote and screenshots it
        lib/store.ts (in-memory room) ◄───┤
                  ▲                       └── lib/pipeline/investigate.ts, on a Challenge:
                  │                             TinyFish Agent drives a data portal, streamed live
        lib/scoring.ts (pure rules)
```

- **Frontend:** Next.js (App Router), React and Tailwind. Clients poll the room state every 1.5 seconds.
- **Game server:** API routes with an in-memory room store. Checks run in the background so a turn never waits on the pipeline.
- **AI:** Gemini extracts claims, judges evidence and refereeing (relevance, off-topic and wrong-side arguments).
- **Web:** TinyFish Search and Fetch for sources, Browser for receipts, Agent for the Investigator.

Every external call degrades gracefully: if a search, fetch, screenshot or model call fails, the claim becomes "unverifiable" or loses its receipt, and the room keeps going.

## Running it

**Requirements:** Node.js 20 or newer, a [TinyFish](https://agent.tinyfish.ai/api-keys) API key and a [Gemini](https://aistudio.google.com) API key.

```bash
git clone git@github.com:doublerook777/Narad.git
cd Narad
npm install
cp .env.example .env.local     # then add your two API keys
npm run lan                    # production build and server on port 3000
```

Open <http://localhost:3000> in two browser tabs. Each tab is its own player. To play across devices on the same network, open the address `npm run lan` prints on the other device (you may need to allow port 3000 through the host's firewall).

Rooms live in the memory of the server process, so run a single long-lived Node server. Serverless hosts such as Vercel are not suitable.

### Configuration

Set these in `.env.local`:

| Variable | Purpose |
| :--- | :--- |
| `TINYFISH_API_KEY` | TinyFish key (Search, Fetch, Browser, Agent) |
| `GEMINI_API_KEY` | Gemini key |
| `GEMINI_MODEL` | Gemini model name, default `gemini-3.5-flash-lite` |
| `PIPELINE` | `real` for live checks, `mock` for fake data with no API calls |
| `AGENT_RUN_LIMIT` | Hard cap on Investigator runs (the Agent is billed per step, about $0.016) |
| `AUTO_ESCALATE` | If `true`, unverifiable numeric claims trigger the Investigator automatically |
| `DEMO_CACHE` | If `true`, a repeated claim is served from the `.cache/` folder |

### Scripts

| Command | What it does |
| :--- | :--- |
| `npm run lan` | Production build and server, reachable on the local network |
| `npm run lan:dev` | Same, with hot reload for development |
| `npm run dev` | Standard Next.js dev server |
| `PIPELINE=mock npm run lan` | Play with simulated checks, free and offline |
| `npm run smoke` | Check connectivity to TinyFish and Gemini (`-- --agent` adds one small Investigator run) |
| `npm run check -- "text"` | Run the fact-checking pipeline on one argument and print the claims |
| `npx tsc --noEmit` | Typecheck |
