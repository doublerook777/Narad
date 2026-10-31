// npm run lan      -> production build + server: stable, no hot-reload flicker. Use this for playing/testing together.
// npm run lan:dev  -> dev server (hot reload) for when you are editing code.
// Rooms live in this process's memory, so only ONE machine runs this; everyone else just opens the URL.
import { networkInterfaces } from "node:os";
import { spawn, spawnSync } from "node:child_process";

const dev = process.argv.includes("--dev");
const port = process.env.PORT || "3000";
const env = { ...process.env, PIPELINE: process.env.PIPELINE || "real" };
const urls = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => `http://${n.address}:${port}`);

console.log(`\nMode: ${dev ? "development (hot reload)" : "production (stable)"}   Pipeline: ${env.PIPELINE}  (PIPELINE=mock npm run lan for free fake checks)`);
console.log("Share one of these with your teammate (same Wi-Fi/LAN):");
urls.forEach((u) => console.log("   " + u));
console.log(`If they can't connect, open the port on this machine:  sudo firewall-cmd --add-port=${port}/tcp\n`);

if (!dev) {
  console.log("Building (about a minute the first time)…\n");
  const build = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, env });
  if (build.status !== 0) { console.error("\nBuild failed. Fix the errors above, or run: npm run lan:dev"); process.exit(build.status ?? 1); }
}

const child = spawn("npx", ["next", dev ? "dev" : "start", "-H", "0.0.0.0", "-p", port], { stdio: "inherit", shell: true, env });
child.on("exit", (code) => process.exit(code ?? 0));
