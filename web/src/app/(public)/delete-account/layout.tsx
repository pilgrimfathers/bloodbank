import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "Permanently delete your Blood Bank Kerala account and data.",
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
