// npm run lan: start the dev server for testing with a teammate on the same Wi-Fi/LAN.
// Rooms live in this process's memory, so only ONE machine runs this; everyone else just opens the URL.
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const urls = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => `http://${n.address}:${port}`);

console.log("\nShare one of these with your teammate (same Wi-Fi/LAN):");
urls.forEach((u) => console.log("   " + u));
console.log(`\nPipeline: ${process.env.PIPELINE || "real"}  (PIPELINE=mock npm run lan for free fake checks)`);
console.log(`If they can't connect, open the port on this machine:  sudo firewall-cmd --add-port=${port}/tcp\n`);

const child = spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PIPELINE: process.env.PIPELINE || "real" },
});
child.on("exit", (code) => process.exit(code ?? 0));
