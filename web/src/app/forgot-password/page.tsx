"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { Droplet, MailCheck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Button, ButtonLink, Field } from "@/components/ui";
import { LanguageSwitch, useI18n, type StringKey } from "@/i18n";

const ERRORS: Record<string, StringKey> = {
  "auth/invalid-email": "login.error.invalidEmail",
  "auth/too-many-requests": "login.error.tooManyRequests",
  "auth/network-request-failed": "login.error.network",
};

export default function ForgotPasswordPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  );
}

function ForgotPassword() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  // The login page passes along whatever email was already typed.
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const send = async () => {
    const trimmed = email.trim();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSentTo(trimmed);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      // Only reported when email enumeration protection is off. Treat it
      // like success so the page never reveals who has an account.
      if (code === "auth/user-not-found") setSentTo(trimmed);
      else setError(t(ERRORS[code] ?? "reset.error.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <LanguageSwitch className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-5">
        <Link href="/" className="mb-8 flex w-fit items-center gap-2 text-lg font-semibold text-blood">
          <Droplet className="size-6 fill-blood" />
          Blood Bank Kerala
        </Link>

        {sentTo ? (
          <>
            <MailCheck className="size-10 text-blood" aria-hidden />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("reset.sentTitle")}</h1>
              <p className="mt-2 text-ink-muted">{t("reset.sentMessage", { email: sentTo })}</p>
              <p className="mt-2 text-sm text-ink-faint">{t("reset.checkSpam")}</p>
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>
            )}
            <ButtonLink href="/login" className="w-full">{t("reset.backToLogin")}</ButtonLink>
            <Button variant="quiet" loading={submitting} onClick={send} className="w-full">{t("reset.resend")}</Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("reset.title")}</h1>
              <p className="mt-1 text-ink-muted">{t("reset.subtitle")}</p>
            </div>
            <Field
              label={t("publicSite.email")}
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {error && (
              <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>
            )}
            <Button type="submit" loading={submitting} className="w-full">{t("reset.submit")}</Button>
            <p className="text-center">
              <Link href="/login" className="font-semibold text-blood hover:underline">{t("reset.backToLogin")}</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
