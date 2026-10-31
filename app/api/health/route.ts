import { NextResponse } from "next/server";
import { getBudgetLedger } from "@/lib/budget";
import { getTinyFishClient } from "@/lib/tinyfish";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  const timestamp = Date.now();
  const pipelineMode = process.env.PIPELINE || "real";

  // 1. Budget Ledger
  const budget = await getBudgetLedger();

  // 2. TinyFish Check
  let tinyfishStatus: { ok: boolean; wallet?: any; error?: string } = { ok: false };
  const tinyfishKey = process.env.TINYFISH_API_KEY;

  if (!tinyfishKey) {
    tinyfishStatus = { ok: false, error: "TINYFISH_API_KEY is not configured" };
  } else {
    try {
      const tf = getTinyFishClient();
      const wallet = await tf.wallet.get();
      tinyfishStatus = { ok: true, wallet };
    } catch (tfErr: any) {
      tinyfishStatus = { ok: false, error: tfErr.message || String(tfErr) };
    }
  }

  // 3. Gemini Check
  let geminiStatus: { ok: boolean; model: string; error?: string } = {
    ok: false,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  };
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    geminiStatus.error = "GEMINI_API_KEY is not configured";
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const pingRes = await ai.models.generateContent({
        model: geminiStatus.model,
        contents: "Respond with 'pong'",
      });
      geminiStatus.ok = !!pingRes.text;
    } catch (gErr: any) {
      geminiStatus.error = gErr.message || String(gErr);
    }
  }

  const isHealthy = (tinyfishStatus.ok || !tinyfishKey) && (geminiStatus.ok || !geminiKey);

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      pipeline: pipelineMode,
      timestamp,
      services: {
        tinyfish: tinyfishStatus,
        gemini: geminiStatus,
      },
      budget: {
        runsCount: budget.runsCount,
        limit: budget.limit,
        remainingRuns: Math.max(0, budget.limit - budget.runsCount),
        totalSteps: budget.totalSteps,
        totalCostEst: budget.totalCostEst,
      },
    },
    { status: isHealthy ? 200 : 200 } // Keep 200 for health reporting
  );
}
