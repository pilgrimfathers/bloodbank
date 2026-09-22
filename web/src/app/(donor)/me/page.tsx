"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { BellRing, Droplet, HandHeart, Pencil } from "lucide-react";
import { COOLOFF_MONTHS } from "@shared/constants";
import { addMonths } from "@shared/eligibility";
import { formatDate } from "@shared/format";
import type { Donation } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { getDonations, logDonation } from "@/lib/data";
import { fromDateInput, toDateValue } from "@/components/donor-form";
import { DonorRing } from "@/components/eligibility";
import { Button, ButtonLink, Field, Surface, cx } from "@/components/ui";

export default function MyDonorPage() {
  const { profile } = useAuth();
  const [donations, setDonations] = useState<Donation[] | null>(null);
  const [showDonated, setShowDonated] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDonations = useCallback(() => {
    if (!profile) return;
    getDonations(profile.id).then(setDonations, err => {
      console.error("Error loading donations:", err);
      setDonations([]);
    });
  }, [profile]);

  // Reload when the last donation changes (e.g. after logging one).
  const lastDonationTime = profile?.lastDonation?.getTime();
  useEffect(() => {
    loadDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, lastDonationTime]);

  // The (donor) layout only renders pages once the profile exists.
  if (!profile) return null;

  const toggleAvailability = async () => {
    setSavingAvailability(true);
    setError(null);
    try {
      await updateDoc(doc(firestore, "users", profile.id), { isDonor: !profile.isDonor, updatedAt: new Date() });
    } catch (err) {
      console.error("Error updating availability:", err);
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSavingAvailability(false);
    }
  };

  const firstName = profile.name?.split(" ")[0] ?? "";
  const place = [profile.area, profile.district].filter(Boolean).join(", ");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Hello, {firstName}</h1>
        <p className="mt-1 text-ink-muted">{profile.district ? `${profile.district}, Kerala` : "Add your district so volunteers can reach you"}</p>
      </header>

      <Surface className="p-5">
        <DonorRing
          bloodType={profile.bloodType}
          lastDonation={profile.lastDonation}
          donationCount={profile.donationCount ?? donations?.length ?? 0}
        />
      </Surface>

      <div className="flex flex-wrap gap-2">
        <Button icon={HandHeart} onClick={() => setShowDonated(!showDonated)} aria-expanded={showDonated}>
          I donated
        </Button>
        <ButtonLink href="/me/request" variant="secondary" icon={Droplet}>Request blood</ButtonLink>
        <ButtonLink href="/me/edit" variant="secondary" icon={Pencil}>Edit details</ButtonLink>
      </div>

      {showDonated && (
        <LogDonationForm
          onDone={() => {
            setShowDonated(false);
            loadDonations();
          }}
        />
      )}

      <Surface className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="font-semibold">Available to donate</p>
          <p className="text-sm text-ink-muted">
            {profile.isDonor
              ? "Volunteers can call you when someone needs your blood group."
              : "Volunteers will not call you until you turn this back on."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={profile.isDonor}
          aria-label="Available to donate"
          disabled={savingAvailability}
          onClick={toggleAvailability}
          className={cx(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
            profile.isDonor ? "bg-leaf" : "bg-line",
          )}
        >
          <span
            className={cx(
              "inline-block size-5 rounded-full bg-white shadow transition-transform",
              profile.isDonor ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </Surface>
      {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}

      <div className="flex gap-3 rounded-xl bg-info-tint p-4 text-info">
        <BellRing className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm">
          Get the Blood Bank Kerala app for request alerts. Notifications only reach the app, not this website.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Your details</h2>
        <Surface>
          <dl className="divide-y divide-line">
            <Detail label="Phone" value={profile.phoneNumber} />
            <Detail label="Email" value={profile.email} />
            <Detail label="Place" value={place} />
            <Detail label="Address" value={profile.address} />
            <Detail label="Medical conditions" value={profile.medicalConditions} />
          </dl>
        </Surface>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Donation history{donations ? ` (${donations.length})` : ""}
        </h2>
        {donations === null ? (
          <p className="text-ink-muted">Loading…</p>
        ) : donations.length === 0 ? (
          <p className="text-ink-muted">No donations recorded yet.</p>
        ) : (
          <Surface>
            <ul className="divide-y divide-line">
              {donations.map(donation => (
                <li key={donation.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-semibold">{formatDate(donation.date)}</p>
                    <p className="text-sm text-ink-muted">{donation.hospital || "Hospital not recorded"}</p>
                  </div>
                  <Droplet className="size-5 fill-blood-tint text-blood" />
                </li>
              ))}
            </ul>
          </Surface>
        )}
      </section>

      <footer className="flex flex-wrap gap-6 border-t border-line pt-6 text-sm">
        <Link href="/privacy" className="text-ink-muted hover:text-ink">Privacy policy</Link>
        <Link href="/delete-account" className="text-blood hover:underline">Delete my account</Link>
      </footer>
    </div>
  );
}

function LogDonationForm({ onDone }: { onDone: () => void }) {
  const { profile } = useAuth();
  const [date, setDate] = useState(toDateValue());
  const [hospital, setHospital] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const donationDate = fromDateInput(date);
    if (!donationDate) return setError("Enter the date you donated.");
    if (donationDate > new Date()) return setError("The donation date cannot be in the future.");

    // Two donations closer than the cool-off period usually means a mistake.
    const last = profile.lastDonation;
    if (last && donationDate < addMonths(last, COOLOFF_MONTHS) && last < addMonths(donationDate, COOLOFF_MONTHS)) {
      const ok = window.confirm(
        `You already have a donation on ${formatDate(last)}, less than ${COOLOFF_MONTHS} months apart. Record this one anyway?`,
      );
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    try {
      await logDonation(profile, { date: donationDate, hospital }, { id: profile.id, name: profile.name });
      onDone();
    } catch (err) {
      console.error("Error logging donation:", err);
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">Log a donation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" type="date" required max={toDateValue()} value={date} onChange={e => setDate(e.target.value)} />
          <Field
            label="Hospital or blood bank (optional)"
            value={hospital}
            onChange={e => setHospital(e.target.value)}
          />
        </div>
        {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={saving}>Save donation</Button>
          <Button type="button" variant="quiet" onClick={onDone}>Cancel</Button>
        </div>
      </form>
    </Surface>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 px-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium">{value || "Not added"}</dd>
    </div>
  );
}
