import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The hire PDF route reads Metropolis fonts + the logo from scripts/pdf-assets
  // at request time. Next.js can't detect these runtime fs reads, so tell the
  // output file tracer to bundle them into the serverless function.
  outputFileTracingIncludes: {
    "/api/hires/[id]/pdf": ["./scripts/pdf-assets/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
