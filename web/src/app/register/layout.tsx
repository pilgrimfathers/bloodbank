import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register as a donor",
  description: "Join Blood Bank Kerala as a blood donor so volunteers can reach you when someone nearby needs blood.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
