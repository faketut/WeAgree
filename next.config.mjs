/** @type {import('next').NextConfig} */

import withBundleAnalyzerInit from "@next/bundle-analyzer";

const isProd = process.env.NODE_ENV === "production";

const withBundleAnalyzer = withBundleAnalyzerInit({
    enabled: process.env.ANALYZE === "true",
});

// CSP notes:
// - 'unsafe-eval' is needed for React Refresh in dev; dropped in prod.
// - 'unsafe-inline' on script-src is still needed for Next 14's hydration
//   pattern (`__next_f` push). The clean fix is per-request nonces injected
//   from middleware + 'strict-dynamic'; that swap needs e2e verification of
//   hydration in a live env. Tracked as a Phase-2 follow-up.
const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const CSP = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

const securityHeaders = [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: CSP },
];

const nextConfig = {
    async headers() {
        return [{ source: "/(.*)", headers: securityHeaders }];
    },
    images: {
        // No remote image hosts allowlisted yet; signatures use data URIs.
        remotePatterns: [],
    },
};

export default withBundleAnalyzer(nextConfig);
