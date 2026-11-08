import { withBetterStack } from "@logtail/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "ia.media-imdb.com" },
      { protocol: "https", hostname: "img.omdbapi.com" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "myanimelist.net" },
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

/**
 * Better Stack wraps the build to ship server and edge logs to Telemetry.
 *
 * It reads NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN and
 * NEXT_PUBLIC_BETTER_STACK_INGESTING_URL from the environment. Without them the
 * wrapper is a no-op and the build still succeeds, which is what keeps local
 * builds and CI from needing production credentials.
 */
export default withBetterStack(nextConfig);
