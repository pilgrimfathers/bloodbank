import type { Metadata } from "next";
import { LAST_UPDATED, PRIVACY_POLICY } from "@shared/privacy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Blood Bank Kerala collects, uses and protects your information.",
  // Play reviewers and donors must be able to find this page.
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Privacy policy</h1>
        <p className="mt-2 text-ink-muted">Last updated {LAST_UPDATED}</p>
      </header>
      {PRIVACY_POLICY.map(section => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.paragraphs?.map(paragraph => (
            <p key={paragraph} className="leading-relaxed">{paragraph}</p>
          ))}
          {section.bullets && (
            <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-blood">
              {section.bullets.map(item => <li key={item}>{item}</li>)}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
