import path from "node:path";
import type { NextConfig } from "next";

// The repo root holds code shared with the mobile app (../shared), so both
// Turbopack and output tracing need to see one level up.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
