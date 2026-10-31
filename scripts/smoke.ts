import nextEnv from "@next/env";
const { loadEnvConfig } = (nextEnv as any).default || nextEnv;
loadEnvConfig(process.cwd());

import { TinyFish } from "@tiny-fish/sdk";
import { GoogleGenAI } from "@google/genai";

async function main() {
  const tinyfishApiKey = process.env.TINYFISH_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  console.log("=== SMOKE TEST START ===");

  // 1. Gemini Test
  console.log("\n[1/5] Testing Gemini...");
  if (!geminiApiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not set in environment or .env.local");
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: "Respond with the word 'OK'.",
      });
      console.log("✅ Gemini response:", response.text?.trim());
    } catch (err: any) {
      console.error("❌ Gemini failed:", err.message || err);
    }
  }

  // 2. TinyFish Client
  if (!tinyfishApiKey) {
    console.warn("⚠️ TINYFISH_API_KEY is not set in environment or .env.local");
    return;
  }

  const client = new TinyFish({ apiKey: tinyfishApiKey });

  // 3. Search Test
  console.log("\n[2/5] Testing TinyFish Search...");
  try {
    const searchRes = await client.search.query({
      query: "renewable energy trends",
      location: "US",
      language: "en",
    });
    console.log("✅ TinyFish Search success. Results found:", Array.isArray(searchRes) ? searchRes.length : "OK");
  } catch (err: any) {
    console.error("❌ TinyFish Search failed:", err.message || err);
  }

  // 4. Fetch Test
  console.log("\n[3/5] Testing TinyFish Fetch...");
  try {
    const fetchRes = await client.fetch.getContents({
      urls: ["https://ourworldindata.org"],
    });
    console.log("✅ TinyFish Fetch success. Result:", fetchRes ? "OK" : "Empty");
  } catch (err: any) {
    console.error("❌ TinyFish Fetch failed:", err.message || err);
  }

  // 5. Browser Session (Create + Delete)
  console.log("\n[4/5] Testing TinyFish Browser Session (Create + Delete)...");
  try {
    const session = await client.browser.sessions.create({
      url: "https://example.com",
      timeout_seconds: 60,
    });
    console.log("✅ Browser session created:", session.session_id);

    try {
      const delRes = await fetch(`https://api.browser.tinyfish.ai/${session.session_id}`, {
        method: "DELETE",
        headers: { "X-API-Key": tinyfishApiKey },
      });
      console.log("✅ Browser session deleted. Status:", delRes.status);
    } catch (delErr: any) {
      console.warn("⚠️ Browser session delete call:", delErr.message || delErr);
    }
  } catch (err: any) {
    console.error("❌ TinyFish Browser session failed:", err.message || err);
  }

  // 6. Wallet Balance
  console.log("\n[5/5] Fetching Wallet Balance...");
  try {
    const wallet = await client.wallet.get();
    console.log("✅ Wallet Balance:", wallet);
  } catch (err: any) {
    console.error("❌ Wallet check failed:", err.message || err);
  }

  // Optional: --agent run
  const runAgent = process.argv.includes("--agent");
  if (runAgent) {
    console.log("\n[BONUS] Running TinyAgent test on Our World in Data...");
    try {
      const stream = await client.agent.stream({
        url: "https://ourworldindata.org",
        goal: "Extract the headline title of the homepage. Return JSON.",
        agent_config: { max_duration_seconds: 60 },
      });

      for await (const event of stream) {
        console.log(`[Agent Event: ${event.type}]`, (event as any).status || (event as any).purpose || "");
        if (event.type === "COMPLETE") {
          console.log("✅ Agent Complete:", (event as any).result);
        }
      }
    } catch (err: any) {
      console.error("❌ TinyAgent run failed:", err.message || err);
    }
  }

  console.log("\n=== SMOKE TEST FINISHED ===");
}

main().catch(console.error);
