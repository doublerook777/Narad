# Narad 🔍⚔️

> **Live 1v1 Debate Arena Powered by Real-Time AI Fact-Checking**  
> Split arguments into claims with **Gemini**, verify against authoritative sources with **TinyFish Search & Fetch**, capture highlighted quote screenshots with **TinyBrowser**, and escalate challenges to **TinyAgent** ("The Investigator") live in an embedded browser stream.

---

## 🏛️ Architecture & Core Flow

```
 Player 1 ──poll 1.5s──┐                          ┌── lib/pipeline/check.ts (Parallel Claim Verification):
 Player 2 ──poll 1.5s──┤                          │      1. Gemini: Claim Extraction (≤4 claims, factual vs opinion)
                       ▼                          │      2. TinySearch: Tier 1 Credible Domains (fallback unrestricted)
            app/api/rooms/[code]/*  ──kick off──► │      3. TinyFetch: Top 2-3 Sources (clean Markdown extraction)
                       │      (fire & forget)     │      4. Gemini: Impartial Verdict + Verbatim Evidence Quote
                       ▼                          │      5. TinyBrowser: Highlighting + Viewport Screenshot (Receipt)
            lib/store.ts (In-Memory Room) ◄─emit──┤
                       ▲                          └── lib/pipeline/investigate.ts (On Player Challenge):
                       │                                 TinyAgent /run-sse on data portal → Live Streaming View (iframe)
            lib/scoring.ts (Pure Rules)                   + Real-Time Progress Steps → Structured Verdict → Re-Score Claim
```

---

## 🚀 Quickstart

### 1. Prerequisites
- Node.js `v20+` or `v24+`
- TinyFish API Key ([agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys))
- Google Gemini API Key ([aistudio.google.com](https://aistudio.google.com))

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/doublerook777/Narad.git
cd Narad

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

Fill in `.env.local`:
```ini
TINYFISH_API_KEY=your_tinyfish_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
PIPELINE=real                     # "real" for live pipeline, "mock" for offline UI dev
AGENT_RUN_LIMIT=20                # Hard cap on TinyAgent runs to protect $16 budget
AUTO_ESCALATE=false               # Auto-trigger investigator for unverifiable numeric stats
DEMO_CACHE=true                   # Cache pipeline outputs in .cache/ for instant re-runs
```

### 3. Verify System Connectivity
```bash
# Smoke test (Search, Fetch, Browser session, Gemini, Wallet balance)
npm run smoke

# Smoke test with a live TinyAgent run
npm run smoke -- --agent

# Test the fact-checking pipeline from the CLI
npm run check -- "Nuclear power emits zero carbon emissions during operation."
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in two separate browser tabs to start a 1v1 debate!

---

## 📋 Member Ownership & File Structure

| Member | Responsibility | Key Files Owned |
| :--- | :--- | :--- |
| **Member A** | **Pipeline & Backend** | `lib/tinyfish.ts`<br>`lib/gemini.ts`<br>`lib/budget.ts`<br>`lib/sources.ts`<br>`lib/cache.ts`<br>`lib/pipeline/*`<br>`app/api/health/route.ts`<br>`scripts/*` |
| **Member B** | **Game & Multiplayer UI** | `app/page.tsx`<br>`app/room/[code]/page.tsx`<br>`app/api/rooms/*`<br>`app/api/receipts/*`<br>`components/*`<br>`lib/store.ts`<br>`lib/scoring.ts` |
| **Shared** | **Contracts** | `lib/types.ts`<br>`package.json`<br>`.env.example` |

---

## 💰 TinyFish Budget Policy ($16 Cap)

- **Search & Fetch are FREE**: Used freely with 10s / 30s timeouts.
- **Browser ($0.002/min)**: A single warm browser session is kept on `globalThis` (`timeout_seconds: 300`) and reused across receipt screenshots to prevent startup latency and waste.
- **TinyAgent ($0.016/step)**: Capped by `lib/budget.ts` (`AGENT_RUN_LIMIT=20`). Every run is tracked in `.cache/budget.json` with step counts and estimated costs.
- **UI Development**: Set `PIPELINE=mock` to build and test frontend components with simulated delays at zero cost.

---

## 🎮 Game Rules & Scoring

| Outcome | Point Delta | Description |
| :--- | :---: | :--- |
| **Supported Claim** | **+10** | First 3 supported claims per turn (+3 for additional) |
| **Refuted Claim** | **−15** | Debunked claim contradicted by credible sources |
| **Misleading Claim** | **−5** | Technically true but cherry-picked or deceptive |
| **Unverifiable / Opinion** | **0** | Subjective opinion or lack of conclusive data |
| **Cited URL Matches** | **+5** | Debater provides an authoritative source confirming their statement |
| **Cited URL Misrepresented** | **−10** | Debater cites a source that does not support their claim |
| **Successful Challenge** | **+10** | Opponent challenges claim; Investigator disproves it |
| **Failed Challenge** | **−5** | Opponent challenges claim; Investigator confirms it |

---

## 🛠️ Available Scripts

- `npm run dev` — Start the local Next.js development server
- `npx tsc --noEmit` — Typecheck the full codebase
- `npm run smoke` — Verify TinyFish, Gemini, and browser connectivity
- `npm run check -- "<argument text>"` — Run the real fact-checking pipeline on a test argument from the CLI
- `npm run build` — Build production bundle

## Playing with a teammate on the same Wi-Fi

One person runs `npm run lan` (production build, stable; it prints the URL). While editing code use `npm run lan:dev` (hot reload, but the home page can start flickering after a long session: restart it). The other opens that URL in a browser, no install needed.
Rooms live in the host's memory, so only the host runs the server. If the other laptop can't connect, the host may need to open the port
(`sudo firewall-cmd --add-port=3000/tcp` on Fedora). To test alone, open two tabs of the same browser: each tab is its own player.
