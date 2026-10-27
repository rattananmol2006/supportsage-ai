import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SupportSage AI — Accountable AI Support",
  description:
    "Unified chat and voice AI that acts, escalates with full context, and provides a complete audit trail. Recapture revenue lost to unanswered inquiries.",
  keywords: [
    "AI customer support",
    "voice AI",
    "support automation",
    "audit trail",
    "human in the loop",
    "SupportSage",
  ],
  openGraph: {
    title: "SupportSage AI — Accountable AI Support",
    description:
      "AI support that acts, escalates with full context, and accounts for every answer.",
    type: "website",
    siteName: "SupportSage AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportSage AI — Accountable AI Support",
    description:
      "AI support that acts, escalates with full context, and accounts for every answer.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-dvh flex-col bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
