import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["shiki", "streamdown", "@streamdown/code"],
};

export default nextConfig;
