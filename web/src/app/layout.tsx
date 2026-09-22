import type { Metadata, Viewport } from "next";
import { Anek_Malayalam } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// One family for the whole console; the Malayalam cut also covers Latin.
const anek = Anek_Malayalam({
  variable: "--font-anek",
  subsets: ["latin", "malayalam"],
  weight: ["400", "500", "600", "700", "800"],
});

const description = "Volunteer console for Blood Bank Kerala: blood requests, donors and donations across Kerala.";

// Vercel sets this on deployments; share images need an absolute base URL.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Blood Bank Kerala",
    template: "%s | Blood Bank Kerala",
  },
  description,
  applicationName: "Blood Bank Kerala",
  openGraph: {
    type: "website",
    siteName: "Blood Bank Kerala",
    title: "Blood Bank Kerala",
    description,
    locale: "en_IN",
  },
  // Internal tool for volunteers: keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#7c0e20",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anek.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
