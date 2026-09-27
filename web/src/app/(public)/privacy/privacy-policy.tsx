"use client";

import { LAST_UPDATED, PRIVACY_POLICY } from "@shared/privacy";
import { PRIVACY_POLICY_ML } from "@shared/i18n/privacyMl";
import { useI18n } from "@/i18n";

// Malayalam readers get a translation; the English text is the one that applies.
export function PrivacyPolicy() {
  const { t, language } = useI18n();
  const malayalam = language === "ml";
  const policy = malayalam ? PRIVACY_POLICY_ML : PRIVACY_POLICY;

  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">{t("privacyPage.title")}</h1>
        <p className="mt-2 text-ink-muted">{t("privacyPage.lastUpdated", { date: LAST_UPDATED })}</p>
        {malayalam && <p className="mt-2 text-sm text-ink-muted">{t("privacyPage.translationNote")}</p>}
      </header>
      {policy.map(section => (
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
