"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Droplet } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { isVolunteer } from "@/lib/data";
import { Button, Field } from "@/components/ui";
import { LanguageSwitch, useI18n, type StringKey } from "@/i18n";

const ERRORS: Record<string, StringKey> = {
  "auth/invalid-credential": "login.error.invalidCredential",
  "auth/invalid-email": "login.error.invalidEmail",
  "auth/user-disabled": "login.error.disabled",
  "auth/too-many-requests": "login.error.tooManyRequests",
  "auth/network-request-failed": "login.error.network",
};

export default function LoginPage() {
  const router = useRouter();
  const { authUser, profile, loading } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Volunteers land in the console, donors on their own page.
    if (!loading && authUser) router.replace(isVolunteer(profile) ? "/dashboard" : "/me");
  }, [authUser, profile, loading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // The effect above redirects once the profile has loaded.
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(t(ERRORS[code] ?? "login.error.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-blood p-12 text-white lg:flex">
        <Link href="/" className="flex w-fit items-center gap-2 text-lg font-semibold">
          <Droplet className="size-6 fill-white" />
          Blood Bank Kerala
        </Link>
        <div>
          <p className="text-[112px] leading-none font-extrabold tracking-tighter text-white/15" aria-hidden>
            A+ B+ O+<br />AB+ O− B−
          </p>
          <h1 className="mt-8 max-w-md text-4xl leading-tight font-bold">
            {t("login.heroTitle")}
          </h1>
          <p className="mt-3 max-w-md text-white/80">
            {t("login.heroText")}
          </p>
        </div>
        <p className="text-sm text-white/60">{t("login.heroFooter")}</p>
      </section>

      <section className="relative flex items-center justify-center p-6">
        <LanguageSwitch className="absolute top-4 right-4" />
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <Link href="/" className="mb-8 flex w-fit items-center gap-2 text-lg font-semibold text-blood lg:hidden">
            <Droplet className="size-6 fill-blood" />
            Blood Bank Kerala
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("publicSite.logIn")}</h2>
            <p className="mt-1 text-ink-muted">{t("login.subtitle")}</p>
          </div>
          <Field
            label={t("publicSite.email")}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Field
            label={t("publicSite.password")}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>
          )}
          <Button type="submit" loading={submitting} className="w-full">{t("publicSite.logIn")}</Button>
          <p className="text-center text-ink-muted">
            {t("login.newDonor")}{" "}
            <Link href="/register" className="font-semibold text-blood hover:underline">{t("login.registerHere")}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
