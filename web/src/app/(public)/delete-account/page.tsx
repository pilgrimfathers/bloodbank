"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { CheckCircle2, Trash2 } from "lucide-react";
import { ACCOUNT_DELETE_ENDPOINT, CONTACT_EMAIL } from "@shared/privacy";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { callNotifyApi } from "@/lib/data";
import { Button, Field, Surface } from "@/components/ui";
import { useI18n, type StringKey } from "@/i18n";

const LOGIN_ERRORS: Record<string, StringKey> = {
  "auth/invalid-credential": "login.error.invalidCredential",
  "auth/invalid-email": "login.error.invalidEmail",
  "auth/too-many-requests": "login.error.tooManyRequests",
};

export default function DeleteAccountPage() {
  const { authUser, profile, loading } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const logIn = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(t(LOGIN_ERRORS[code] ?? "login.error.failed"));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm(t("deleteAccount.confirm"))) return;
    setError(null);
    setBusy(true);
    try {
      await callNotifyApi(ACCOUNT_DELETE_ENDPOINT, {});
      await signOut(auth).catch(() => {});
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">{t("deleteAccount.title")}</h1>
        <p className="mt-2 leading-relaxed text-ink-muted">{t("deleteAccount.intro")}</p>
      </header>

      <Surface className="max-w-md p-6">
        {done ? (
          <div className="space-y-2">
            <CheckCircle2 className="size-8 text-leaf" />
            <p className="text-lg font-semibold">{t("deleteAccount.done.title")}</p>
            <p className="text-ink-muted">{t("deleteAccount.done.message")}</p>
          </div>
        ) : loading ? (
          <p className="text-ink-muted">{t("publicSite.loadingEllipsis")}</p>
        ) : authUser ? (
          <div className="space-y-4">
            <p>
              {t("deleteAccount.loggedInAs")} <span className="font-semibold">{profile?.name ?? authUser.email}</span>
              {authUser.email && <span className="text-ink-muted"> ({authUser.email})</span>}.
            </p>
            <Button variant="danger" icon={Trash2} loading={busy} onClick={deleteAccount} className="w-full">
              {t("me.deleteMyAccount")}
            </Button>
            <button onClick={() => signOut(auth)} className="text-sm text-ink-muted hover:text-ink">
              {t("deleteAccount.notYou")}
            </button>
          </div>
        ) : (
          <form onSubmit={logIn} className="space-y-4">
            <p className="text-ink-muted">{t("deleteAccount.loginIntro")}</p>
            <Field label={t("publicSite.email")} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Field label={t("publicSite.password")} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="submit" loading={busy} className="w-full">{t("deleteAccount.loginToContinue")}</Button>
          </form>
        )}
        {error && <p role="alert" className="mt-4 rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
      </Surface>

      <p className="text-sm text-ink-muted">
        {t("deleteAccount.noApp", { email: CONTACT_EMAIL })}{" "}
        {t("deleteAccount.readBefore")}
        <Link href="/privacy" className="text-blood hover:underline">{t("deleteAccount.readLink")}</Link>
        {t("deleteAccount.readAfter")}
      </p>
    </div>
  );
}
