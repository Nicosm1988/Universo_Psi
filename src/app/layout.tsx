import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PointerIllumination } from "@/components/effects/pointer-illumination";
import "./globals.css";

// One local variable font powers body and display text, matching Universo
// Senda's identity. The licensed asset lives in the repo so production
// builds don't depend on Google Fonts availability.
const raleway = localFont({
  src: "./fonts/raleway-variable.ttf",
  variable: "--font-raleway",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

const themeInitializationScript = `
(function () {
  var storageKey = "universo-psi-theme:v1";
  var theme = "light";
  try {
    var savedTheme = window.localStorage.getItem(storageKey);
    if (savedTheme === "light" || savedTheme === "dark") {
      theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (_) {}
  document.documentElement.dataset.theme = theme;
})();
`;

// A nonce-based CSP requires every HTML response to be rendered per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://universo-psi-eight.vercel.app"),
  title: {
    default: "Universo Psi · Encontrá un profesional de salud mental",
    template: "%s · Universo Psi",
  },
  description:
    "Encontrá psicólogos, psiquiatras, psicopedagogos y otros profesionales de salud mental, comparás perfiles y contactá al que mejor se adapte a tu búsqueda.",
  applicationName: "Universo Psi",
  category: "professional directory",
  keywords: [
    "psicólogo",
    "psiquiatra",
    "psicopedagogo",
    "musicoterapeuta",
    "salud mental",
    "terapia online",
    "Argentina",
  ],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Universo Psi",
    title: "Universo Psi · Encontrá un profesional de salud mental",
    description: "Buscá psicólogos, psiquiatras y psicopedagogos, comparás perfiles y contactá de forma directa.",
  },
  twitter: {
    card: "summary",
    title: "Universo Psi",
    description: "Buscá profesionales de salud mental y contactá de forma directa.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#221b34" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="es"
      className={raleway.variable}
      data-scroll-behavior="smooth"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <PointerIllumination />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
