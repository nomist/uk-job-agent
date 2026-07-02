import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: an unrelated lockfile in the parent directory
  // otherwise makes Next.js guess the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
