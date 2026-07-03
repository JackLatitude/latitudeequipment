import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The hire PDF route reads Metropolis fonts + the logo from scripts/pdf-assets
  // at request time. Next.js can't detect these runtime fs reads, so tell the
  // output file tracer to bundle them into the serverless function.
  outputFileTracingIncludes: {
    "/api/hires/[id]/pdf": ["./scripts/pdf-assets/**/*"],
  },
};

export default nextConfig;
