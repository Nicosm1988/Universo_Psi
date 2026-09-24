import type { NextConfig } from "next";

const supabaseUrl = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://gwizdgboqwpzyiaqcxbb.supabase.co",
);
const preventIndexing =
  process.env.SITE_NOINDEX === "true" || process.env.VERCEL_ENV === "preview";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    taint: true,
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    // Recursos y convenios se retiraron del producto. Las URLs quedaron
    // indexadas mientras existieron, así que se redirigen de forma permanente
    // en lugar de devolver 404.
    return [
      { source: "/recursos", destination: "/profesionales", permanent: true },
      { source: "/recursos/:slug", destination: "/profesionales", permanent: true },
      { source: "/convenios", destination: "/profesionales", permanent: true },
      { source: "/convenios/:slug", destination: "/profesionales", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...(preventIndexing
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
            : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
