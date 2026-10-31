import nextEnv from "@next/env";

interface NextEnvModule {
  default?: { loadEnvConfig: (dir: string) => void };
  loadEnvConfig?: (dir: string) => void;
}
const envMod = nextEnv as unknown as NextEnvModule;
const loadEnvConfig = envMod.default?.loadEnvConfig || envMod.loadEnvConfig || (() => {});
loadEnvConfig(process.cwd());

import { checkTurn } from "../lib/pipeline/check";
import type { CheckInput, Claim } from "../lib/types";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npm run check -- \"<argument text>\" [--topic \"<topic>\"]");
    process.exit(1);
  }

  let topic = "General Debate";
  let argumentText = "";

  const topicIdx = args.indexOf("--topic");
  if (topicIdx !== -1 && args[topicIdx + 1]) {
    topic = args[topicIdx + 1];
    args.splice(topicIdx, 2);
  }
  argumentText = args.join(" ").trim();

  console.log(`\n========================================`);
  console.log(`Topic:    "${topic}"`);
  console.log(`Argument: "${argumentText}"`);
  console.log(`========================================\n`);

  const startTime = Date.now();

  const input: CheckInput = {
    topic,
    turn: {
      id: "turn-cli",
      player: "p1",
      round: 1,
      text: argumentText,
      submittedAt: startTime,
    },
  };

  const claimsMap = new Map<string, Claim>();

  const claims = await checkTurn(input, (claim: Claim) => {
    claimsMap.set(claim.id, claim);
    const badge = `[${claim.status.toUpperCase()}]`.padEnd(12);
    const verdict = claim.verdict !== "pending" ? `-> ${claim.verdict.toUpperCase()}` : "";
    console.log(`${badge} ${claim.id.slice(0, 8)}: "${claim.text.slice(0, 60)}" ${verdict}`);
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nFinished in ${durationSec}s. Total claims: ${claims.length}`);
  console.log(`\nFinal Claims JSON:`);
  console.log(JSON.stringify(claims, null, 2));
}

main().catch((err) => {
  console.error("Fatal error during check:", err);
  process.exit(1);
});
