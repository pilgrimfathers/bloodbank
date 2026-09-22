"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { BellRing, Droplet, HandHeart, LayoutGrid, LogOut, Menu, Users, X, type LucideIcon } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { isVolunteer } from "@/lib/data";
import { Spinner, cx } from "@/components/ui";

const NAV: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/requests", label: "Requests", icon: HandHeart },
  { href: "/donors", label: "Donors", icon: Users },
  { href: "/notify", label: "Notify", icon: BellRing, adminOnly: true },
];

export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const pathname = usePathname();
  const { authUser, profile, loading } = useAuth();
  // Remember which page the mobile menu was opened on, so navigating closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;

  // Signed-out visitors go to login; donors have their own pages under /me.
  const isDonorOnly = !loading && !!authUser && !isVolunteer(profile);
  useEffect(() => {
    if (!loading && !authUser) router.replace("/login");
    else if (isDonorOnly) router.replace("/me");
  }, [authUser, loading, isDonorOnly, router]);

  if (loading || !authUser) return <Spinner />;

  if (isDonorOnly) return <Spinner />;

  const isActive = (href: string) => pathname.startsWith(href);
  const scope = profile!.role === "admin" || !profile!.volunteerDistricts?.length
    ? "All of Kerala"
    : profile!.volunteerDistricts.join(", ");

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.filter(item => !item.adminOnly || profile!.role === "admin").map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors",
            isActive(href) ? "bg-white text-blood-dark" : "text-white/80 hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/15 pt-4">
      <p className="truncate font-semibold text-white">{profile!.name}</p>
      <p className="truncate text-sm text-white/70">
        {profile!.role === "admin" ? "Admin" : "Volunteer"}, {scope}
      </p>
      <button
        onClick={() => signOut(auth)}
        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
      >
        <LogOut className="size-4" />
        Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col justify-between bg-blood-dark p-5 lg:flex">
        <div>
          <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-1 text-lg font-bold text-white">
            <Droplet className="size-6 fill-white" />
            Blood Bank Kerala
          </Link>
          {nav}
        </div>
        {account}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-blood-dark px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
          <Droplet className="size-5 fill-white" />
          Blood Bank Kerala
        </Link>
        <button
          onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="sticky top-[60px] z-10 space-y-4 bg-blood-dark px-4 pb-5 lg:hidden">
          {nav}
          {account}
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
