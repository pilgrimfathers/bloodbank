import type { Metadata } from "next";
import Link from "next/link";
import { Droplet, HandHeart, Smartphone, UserPlus, Users } from "lucide-react";
import { BLOOD_TYPES, COOLOFF_MONTHS, KERALA_DISTRICTS } from "@shared/constants";
import { CONTACT_EMAIL, PLAY_STORE_URL } from "@shared/privacy";

export const metadata: Metadata = {
  title: { absolute: "Blood Bank Kerala: find blood donors across Kerala" },
  description:
    "Register as a blood donor in any of Kerala's 14 districts. Volunteers match blood requests to donors who can give today.",
  // The landing page is public; the console behind login stays out of search.
  robots: { index: true, follow: true },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-blood text-white">
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Droplet className="size-6 fill-white" />
            Blood Bank Kerala
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-white/85 hover:text-white">
              Log in
            </Link>
            <Link href="/register" className="rounded-lg bg-white px-4 py-2 font-semibold text-blood-dark hover:bg-white/90">
              Register
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-8 sm:pt-20 sm:pb-28 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <h1 className="max-w-2xl text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              The right donor, one phone call away.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
              Blood Bank Kerala keeps a list of willing donors across all {KERALA_DISTRICTS.length} districts.
              When a hospital needs blood, volunteers reach donors who can give today, and let everyone else rest
              until they can.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 font-semibold text-blood-dark hover:bg-white/90"
              >
                <UserPlus className="size-5" />
                Register as a donor
              </Link>
              <a
                href={PLAY_STORE_URL}
                className="inline-flex h-12 items-center gap-2 rounded-lg border-[1.5px] border-white/50 px-5 font-semibold text-white hover:bg-white/10"
              >
                <Smartphone className="size-5" />
                Get the Android app
              </a>
            </div>
          </div>
          {/* Every blood group, set large and faint: the brand's signature texture. */}
          <div aria-hidden className="hidden grid-cols-4 gap-x-10 gap-y-3 text-right text-6xl leading-none font-extrabold tracking-tighter text-white/15 select-none lg:grid">
            {BLOOD_TYPES.map(type => <span key={type}>{type}</span>)}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:px-8">
        <section>
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            <Step number={1} title="Register once">
              Add your blood group, district and phone number. It takes two minutes, in the app or here.
            </Step>
            <Step number={2} title="Volunteers match requests">
              When someone needs blood, a volunteer checks the request and alerts donors of that group who are
              ready to give.
            </Step>
            <Step number={3} title="Give, then rest">
              After you donate, log it. You won&apos;t be asked again until your body has had time to recover.
            </Step>
          </ol>
        </section>

        <section className="grid items-center gap-10 rounded-2xl bg-surface p-8 sm:p-12 lg:grid-cols-[auto_1fr]">
          <CooloffRing />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">The {COOLOFF_MONTHS}-month rule, built in</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-muted">
              Donors need time to rebuild their blood. The ring around your blood group fills up over{" "}
              {COOLOFF_MONTHS} months after each donation. Until it&apos;s full, volunteers see that you&apos;re
              resting and won&apos;t call you, and the app reminds you on the day you can give again.
            </p>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Audience
            icon={HandHeart}
            title="Need blood for someone?"
            text="Post a request with the hospital and the blood group. Volunteers review every request and alert matching donors in the district."
            action={{ href: "/me/request", label: "Request blood" }}
          />
          <Audience
            icon={Users}
            title="Volunteering with us?"
            text="Log in to the volunteer console to search donors by district and blood group, log donations and manage requests."
            action={{ href: "/login", label: "Volunteer log in" }}
          />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-muted sm:px-8">
          <p>Blood Bank Kerala, run by volunteers. Contact {CONTACT_EMAIL}</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">Privacy policy</Link>
            <Link href="/delete-account" className="hover:text-ink">Delete account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="flex size-10 items-center justify-center rounded-full bg-blood-tint font-bold text-blood">
        {number}
      </span>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 leading-relaxed text-ink-muted">{children}</p>
    </li>
  );
}

function Audience({ icon: Icon, title, text, action }: {
  icon: typeof Users;
  title: string;
  text: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-8">
      <Icon className="size-7 text-blood" />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-2 flex-1 leading-relaxed text-ink-muted">{text}</p>
      <Link
        href={action.href}
        className="mt-6 inline-flex h-11 w-fit items-center rounded-lg bg-blood px-5 font-semibold text-white hover:bg-blood-dark"
      >
        {action.label}
      </Link>
    </div>
  );
}

// Static illustration of the refill ring, part-way through the cool-off.
function CooloffRing() {
  const size = 180;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = 0.62;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-turmeric)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tracking-tight text-blood">O+</span>
        <span className="text-sm font-medium text-turmeric">69 days to go</span>
      </span>
    </div>
  );
}
