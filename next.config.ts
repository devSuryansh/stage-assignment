import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep mammoth external; do NOT eagerly load pdf-parse (needs DOMMatrix/canvas).
  serverExternalPackages: ["mammoth"],
  outputFileTracingIncludes: {
    "/api/jobs": ["./fixtures/**/*"],
    "/api/jobs/[id]": ["./fixtures/**/*"],
    "/api/jobs/[id]/approve": ["./fixtures/**/*"],
  },
};

export default nextConfig;
