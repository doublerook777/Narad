import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Let teammates on the same Wi-Fi/LAN open the dev server (Next blocks other origins by default).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
