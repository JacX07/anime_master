import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: { "/*": ["./CHANGELOG.md"] },
  experimental: { agentUpgrade: "security" },
  // PixiJS copié par scripts/vendor-pixi.mjs : le chemin porte la version, le contenu ne change jamais
  async headers() {
    return ["/vendor/:path*", "/illustrations/:file"].map((source) => ({ source, headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }));
  },
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
