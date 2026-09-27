"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Droplet } from "lucide-react";
import type { UserProfile } from "@shared/types";
import { auth, firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { logDonation } from "@/lib/data";
import { DonorForm, DonorFormError, type DonorFormValues } from "@/components/donor-form";
import { Button, Field } from "@/components/ui";
import { LanguageSwitch, useI18n, type StringKey } from "@/i18n";

const ERRORS: Record<string, StringKey> = {
  "auth/email-already-in-use": "register.error.emailInUse",
  "auth/invalid-email": "login.error.invalidEmail",
  "auth/weak-password": "register.error.weakPassword",
  "auth/network-request-failed": "login.error.network",
  "auth/too-many-requests": "login.error.tooManyRequests",
};

type Step = "account" | "details";

export default function RegisterPage() {
  const router = useRouter();
  const { authUser, loading } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("account");
  const [account, setAccount] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  // Signing up signs the user in before their profile is written; don't
  // redirect away until registration has finished.
  const registering = useRef(false);

  useEffect(() => {
    if (!loading && authUser && !registering.current) router.replace("/me");
  }, [authUser, loading, router]);

  const handleNext = (event: FormEvent) => {
    event.preventDefault();
    if (account.password.length < 6) {
      setError(t("register.passwordShort"));
      return;
    }
    if (account.password !== account.confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }
    setError(null);
    setStep("details");
  };

  const handleRegister = async (values: DonorFormValues) => {
    registering.current = true;
    try {
      const email = account.email.trim();
      const { user } = await createUserWithEmailAndPassword(auth, email, account.password);
      await updateProfile(user, { displayName: values.name });

      const { lastDonation, notes: _notes, ...details } = values;
      void _notes;
      const profile = {
        ...details,
        email,
        role: "donor",
        verified: false,
        status: "active",
        hasAccount: true,
        lastDonation: null,
        donationCount: 0,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(firestore, "users", user.uid), profile);

      // A self-reported past donation still starts the cool-off period.
      if (lastDonation) {
        await logDonation(
          { ...profile, id: user.uid } as UserProfile,
          { date: lastDonation, hospital: "Self-reported at registration" },
          { id: user.uid, name: values.name },
        );
      }
      router.replace("/me");
    } catch (err) {
      registering.current = false;
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use" || code === "auth/invalid-email" || code === "auth/weak-password") {
        setStep("account");
        setError(t(ERRORS[code]));
        return;
      }
      console.error("Registration error:", err);
      throw new DonorFormError(t(ERRORS[code] ?? "register.error.failed"));
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-blood p-12 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Droplet className="size-6 fill-white" />
          Blood Bank Kerala
        </Link>
        <div>
          <h1 className="max-w-md text-4xl leading-tight font-bold">
            {t("register.heroTitle")}
          </h1>
          <p className="mt-3 max-w-md text-white/80">
            {t("register.heroText")}
          </p>
        </div>
        <p className="text-sm text-white/60">{t("register.heroFooter")}</p>
      </section>

      <section className="flex justify-center p-6 lg:items-center">
        <div className="w-full max-w-lg py-6">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-blood lg:invisible">
              <Droplet className="size-6 fill-blood" />
              Blood Bank Kerala
            </Link>
            <LanguageSwitch />
          </div>

          <p className="text-sm font-medium text-ink-muted">{t("register.step", { step: step === "account" ? 1 : 2 })}</p>
          <div className="mt-2 mb-6 flex gap-2" aria-hidden>
            <span className="h-1.5 flex-1 rounded-full bg-blood" />
            <span className={`h-1.5 flex-1 rounded-full ${step === "details" ? "bg-blood" : "bg-line"}`} />
          </div>

          {step === "account" ? (
            <form onSubmit={handleNext} className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("publicSite.registerAsDonor")}</h2>
                <p className="mt-1 text-ink-muted">{t("register.subtitle")}</p>
              </div>
              <Field
                label={t("publicSite.email")}
                type="email"
                autoComplete="email"
                required
                value={account.email}
                onChange={e => setAccount({ ...account, email: e.target.value })}
              />
              <Field
                label={t("publicSite.password")}
                type="password"
                autoComplete="new-password"
                required
                hint={t("register.passwordHint")}
                value={account.password}
                onChange={e => setAccount({ ...account, password: e.target.value })}
              />
              <Field
                label={t("register.confirmPassword")}
                type="password"
                autoComplete="new-password"
                required
                value={account.confirmPassword}
                onChange={e => setAccount({ ...account, confirmPassword: e.target.value })}
              />
              {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
              <Button type="submit" className="w-full">{t("register.continue")}</Button>
              <p className="text-center text-sm text-ink-muted">
                {t("register.alreadyRegistered")}{" "}
                <Link href="/login" className="font-semibold text-blood hover:underline">{t("publicSite.logIn")}</Link>
              </p>
            </form>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("register.detailsTitle")}</h2>
                <p className="mt-1 text-ink-muted">{t("register.detailsIntro")}</p>
              </div>
              <DonorForm
                showLastDonation
                submitLabel={t("register.submit")}
                onSubmit={handleRegister}
              />
              <Button variant="quiet" onClick={() => setStep("account")}>{t("register.backToAccount")}</Button>
              <p className="text-sm text-ink-muted">
                {t("register.agreeBefore")}
                <Link href="/privacy" className="text-blood hover:underline">{t("register.agreeLink")}</Link>
                {t("register.agreeAfter")}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
