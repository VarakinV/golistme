import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["satori", "@resvg/resvg-js", "harfbuzzjs"],
  outputFileTracingIncludes: {
    "/api/orders/**": [
      "./lib/social/fonts/**",
      "./node_modules/harfbuzzjs/**",
      "./node_modules/@resvg/**",
    ],
    "/api/admin/social-templates/**": [
      "./lib/social/fonts/**",
      "./node_modules/harfbuzzjs/**",
      "./node_modules/@resvg/**",
    ],
  },
  images: {
    // Remote images are served from the GoList storage bucket. Only use
    // generic S3 patterns; never hardcode another product's bucket here.
    remotePatterns: [
      { protocol: 'https', hostname: 's3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
    ],
  },
};

export default nextConfig;
