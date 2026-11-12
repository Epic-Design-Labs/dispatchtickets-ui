import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Pages that grant access must never render inside another site's frame:
 * an invisible frame over a decoy button is how an "approve" click gets stolen
 * (clickjacking). The consent screen is the one that matters; /login is on the
 * way to it.
 */
const NO_FRAMING = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/integrations/authorize', headers: NO_FRAMING },
      { source: '/login', headers: NO_FRAMING },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
