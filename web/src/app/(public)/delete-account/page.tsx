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

const LOGIN_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Email or password is wrong.",
  "auth/invalid-email": "That email address is not valid.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
};

export default function DeleteAccountPage() {
  const { authUser, profile, loading } = useAuth();
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
      setError(LOGIN_ERRORS[code] ?? "Could not log in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account permanently? Your profile, donation history and requests will be erased. This cannot be undone.")) return;
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
        <h1 className="text-4xl font-bold tracking-tight">Delete your account</h1>
        <p className="mt-2 leading-relaxed text-ink-muted">
          Deleting your account permanently erases your profile, contact details, blood group, donation history,
          the blood requests you posted and your notification settings. You can also do this in the app under
          Profile.
        </p>
      </header>

      <Surface className="max-w-md p-6">
        {done ? (
          <div className="space-y-2">
            <CheckCircle2 className="size-8 text-leaf" />
            <p className="text-lg font-semibold">Your account has been deleted</p>
            <p className="text-ink-muted">Thank you for being a donor. You can sign up again at any time.</p>
          </div>
        ) : loading ? (
          <p className="text-ink-muted">Loading…</p>
        ) : authUser ? (
          <div className="space-y-4">
            <p>
              Logged in as <span className="font-semibold">{profile?.name ?? authUser.email}</span>
              {authUser.email && <span className="text-ink-muted"> ({authUser.email})</span>}.
            </p>
            <Button variant="danger" icon={Trash2} loading={busy} onClick={deleteAccount} className="w-full">
              Delete my account
            </Button>
            <button onClick={() => signOut(auth)} className="text-sm text-ink-muted hover:text-ink">
              Not you? Log out
            </button>
          </div>
        ) : (
          <form onSubmit={logIn} className="space-y-4">
            <p className="text-ink-muted">Log in with the email and password you use in the app.</p>
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="submit" loading={busy} className="w-full">Log in to continue</Button>
          </form>
        )}
        {error && <p role="alert" className="mt-4 rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
      </Surface>

      <p className="text-sm text-ink-muted">
        Donor added by a volunteer and don&apos;t use the app? Email {CONTACT_EMAIL} and we will delete your
        details. Read the <Link href="/privacy" className="text-blood hover:underline">privacy policy</Link>.
      </p>
    </div>
  );
}
