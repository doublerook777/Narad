import nextEnv from "@next/env";
const { loadEnvConfig } = (nextEnv as any).default || nextEnv;
loadEnvConfig(process.cwd());

async function main() {
  const arg = process.argv.slice(2).join(" ");
  if (!arg) {
    console.log("Usage: npm run check -- \"argument text\"");
    process.exit(1);
  }
  console.log("Checking argument:", arg);
  console.log("Pipeline check will be implemented in Phase 1.");
}

main().catch(console.error);
