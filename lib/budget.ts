import fs from "fs/promises";
import path from "path";

export interface BudgetRecord {
  runId: string;
  steps: number;
  costEst: number; // $0.016 per step
  timestamp: number;
  goal?: string;
  portalUrl?: string;
}

export interface BudgetLedger {
  runsCount: number;
  totalSteps: number;
  totalCostEst: number;
  limit: number;
  runs: BudgetRecord[];
}

const COST_PER_STEP = 0.016;

function getBudgetFilePath(): string {
  return path.join(process.cwd(), ".cache", "budget.json");
}

function getAgentLimit(): number {
  const envVal = process.env.AGENT_RUN_LIMIT;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 20; // Default limit
}

export async function getBudgetLedger(): Promise<BudgetLedger> {
  const limit = getAgentLimit();
  const filePath = getBudgetFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return {
      runsCount: Number(data.runsCount) || 0,
      totalSteps: Number(data.totalSteps) || 0,
      totalCostEst: Number(data.totalCostEst) || 0,
      limit,
      runs: Array.isArray(data.runs) ? data.runs : [],
    };
  } catch {
    return {
      runsCount: 0,
      totalSteps: 0,
      totalCostEst: 0,
      limit,
      runs: [],
    };
  }
}

export async function canRunAgent(): Promise<boolean> {
  const ledger = await getBudgetLedger();
  const limit = getAgentLimit();
  return ledger.runsCount < limit;
}

export async function recordAgentRun(
  runId: string,
  steps: number,
  meta?: { goal?: string; portalUrl?: string }
): Promise<BudgetRecord> {
  const ledger = await getBudgetLedger();
  const stepCount = Math.max(0, steps);
  const costEst = parseFloat((stepCount * COST_PER_STEP).toFixed(4));

  const record: BudgetRecord = {
    runId,
    steps: stepCount,
    costEst,
    timestamp: Date.now(),
    goal: meta?.goal,
    portalUrl: meta?.portalUrl,
  };

  ledger.runsCount += 1;
  ledger.totalSteps += stepCount;
  ledger.totalCostEst = parseFloat((ledger.totalCostEst + costEst).toFixed(4));
  ledger.runs.push(record);

  try {
    const filePath = getBudgetFilePath();
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(ledger, null, 2), "utf-8");
  } catch (err) {
    console.warn("[budget] failed to persist budget ledger:", err);
  }

  console.log(
    `[budget] Recorded Agent run ${runId}: ${stepCount} steps (~$${costEst.toFixed(
      3
    )}). Total runs: ${ledger.runsCount}/${ledger.limit}`
  );

  return record;
}
