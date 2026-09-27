"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Droplet, LayoutGrid, LogOut, UserRoundX } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { isVolunteer } from "@/lib/data";
import { Button, ButtonLink, EmptyState, Spinner } from "@/components/ui";
import { LanguageSwitch, useI18n } from "@/i18n";

// Signed-in area for donors (any role can use it).
export default function DonorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { authUser, profile, loading } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && !authUser) router.replace("/login");
  }, [authUser, loading, router]);

  if (loading || !authUser) return <Spinner />;

  return (
    <div className="min-h-screen">
      <header className="bg-blood-dark">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/me" className="flex items-center gap-2 font-bold text-white">
            <Droplet className="size-5 fill-white" />
            Blood Bank Kerala
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <LanguageSwitch tone="dark" />
            {isVolunteer(profile) && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
              >
                <LayoutGrid className="size-4" />
                {t("me.volunteerConsole")}
              </Link>
            )}
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
              {t("publicSite.logOut")}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {profile ? children : (
          <EmptyState
            icon={UserRoundX}
            title={t("me.missing.title")}
            message={authUser.email ? t("me.missing.message", { email: authUser.email }) : t("me.missing.messageNoEmail")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href="/register">{t("publicSite.registerAsDonor")}</ButtonLink>
                <Button variant="secondary" icon={LogOut} onClick={() => signOut(auth)}>{t("publicSite.logOut")}</Button>
              </div>
            }
          />
        )}
      </main>
    </div>
  );
}
