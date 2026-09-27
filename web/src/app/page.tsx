import type { Metadata } from "next";
import { Landing } from "./landing";

export const metadata: Metadata = {
  title: { absolute: "Blood Bank Kerala: find blood donors across Kerala" },
  description:
    "Register as a blood donor in any of Kerala's 14 districts. Volunteers match blood requests to donors who can give today.",
  // The landing page is public; the console behind login stays out of search.
  robots: { index: true, follow: true },
};

export default function LandingPage() {
  return <Landing />;
}
