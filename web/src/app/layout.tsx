import type { Metadata } from "next";
import { Anek_Malayalam } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// One family for the whole console; the Malayalam cut also covers Latin.
const anek = Anek_Malayalam({
  variable: "--font-anek",
  subsets: ["latin", "malayalam"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Blood Bank Kerala",
    template: "%s | Blood Bank Kerala",
  },
  description: "Volunteer console for Blood Bank Kerala: blood requests, donors and donations across Kerala.",
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
