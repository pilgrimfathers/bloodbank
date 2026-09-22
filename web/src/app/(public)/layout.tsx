import Link from "next/link";
import { Droplet } from "lucide-react";

// Pages anyone can open without logging in (linked from Google Play).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-blood">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <Droplet className="size-5 fill-white" />
            Blood Bank Kerala
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
