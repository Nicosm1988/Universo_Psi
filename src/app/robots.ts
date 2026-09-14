import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_NOINDEX === "true" || process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://universo-psi-eight.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard/", "/admin/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
