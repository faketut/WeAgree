/** @type {import('next').NextConfig} */

// Strict but practical CSP. 'unsafe-inline' is required for Next's runtime
// inline styles and hydration shims; tighten if/when a nonce strategy lands.
const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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

export default nextConfig;
