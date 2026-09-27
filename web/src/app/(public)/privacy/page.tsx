import type { Metadata } from "next";
import { PrivacyPolicy } from "./privacy-policy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Blood Bank Kerala collects, uses and protects your information.",
  // Play reviewers and donors must be able to find this page.
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
