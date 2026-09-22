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

const ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Email or password is wrong.",
  "auth/invalid-email": "That email address is not valid.",
  "auth/user-disabled": "This account has been disabled. Contact an admin.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "No internet connection. Check your network and try again.",
};

export default function LoginPage() {
  const router = useRouter();
  const { authUser, profile, loading } = useAuth();
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
      setError(ERRORS[code] ?? "Could not log in. Check your connection and try again.");
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
            Find the right donor before the hospital calls twice.
          </h1>
          <p className="mt-3 max-w-md text-white/80">
            Blood requests, donors and donations across all 14 districts, in one place.
          </p>
        </div>
        <p className="text-sm text-white/60">Donors and volunteers log in here with the same account as the app.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <Link href="/" className="mb-8 flex w-fit items-center gap-2 text-lg font-semibold text-blood lg:hidden">
            <Droplet className="size-6 fill-blood" />
            Blood Bank Kerala
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Log in</h2>
            <p className="mt-1 text-ink-muted">Use the same email and password as the app.</p>
          </div>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>
          )}
          <Button type="submit" loading={submitting} className="w-full">Log in</Button>
          <p className="text-center text-ink-muted">
            New donor?{" "}
            <Link href="/register" className="font-semibold text-blood hover:underline">Register here</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
