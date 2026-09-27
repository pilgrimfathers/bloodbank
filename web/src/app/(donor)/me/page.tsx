"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { BellRing, Droplet, HandHeart, Pencil, UserSearch } from "lucide-react";
import { COOLOFF_MONTHS } from "@shared/constants";
import { addMonths } from "@shared/eligibility";
import type { Donation } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { getDonations, logDonation } from "@/lib/data";
import { fromDateInput, toDateValue } from "@/components/donor-form";
import { DonorRing } from "@/components/eligibility";
import { VisibilityPicker } from "@/components/visibility";
import { Button, ButtonLink, Field, Surface, cx } from "@/components/ui";
import { useI18n, type StringKey } from "@/i18n";

export default function MyDonorPage() {
  const { profile } = useAuth();
  const { t, formatDate, districtName } = useI18n();
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
      setError(t("me.couldNotSave"));
    } finally {
      setSavingAvailability(false);
    }
  };

  const firstName = profile.name?.split(" ")[0] ?? "";
  const place = [profile.area, districtName(profile.district)].filter(Boolean).join(", ");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("me.hello", { name: firstName })}</h1>
        <p className="mt-1 text-ink-muted">
          {profile.district ? t("common.inKerala", { district: districtName(profile.district) }) : t("me.addDistrict")}
        </p>
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
          {t("me.iDonated")}
        </Button>
        <ButtonLink href="/me/request" variant="secondary" icon={Droplet}>{t("publicSite.requestBlood")}</ButtonLink>
        <ButtonLink href="/me/donors" variant="secondary" icon={UserSearch}>{t("publicSite.findDonors")}</ButtonLink>
        <ButtonLink href="/me/edit" variant="secondary" icon={Pencil}>{t("me.editDetails")}</ButtonLink>
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
          <p className="font-semibold">{t("me.available")}</p>
          <p className="text-sm text-ink-muted">
            {profile.isDonor
              ? t("me.availableOn")
              : t("me.availableOff")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={profile.isDonor}
          aria-label={t("me.available")}
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
          {t("me.appNote")}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("me.yourDetails")}</h2>
        <Surface>
          <dl className="divide-y divide-line">
            <Detail label="me.phone" value={profile.phoneNumber} />
            <Detail label="publicSite.email" value={profile.email} />
            <Detail label="me.place" value={place} />
            <Detail label="me.address" value={profile.address} />
            <Detail label="me.medical" value={profile.medicalConditions} />
          </dl>
        </Surface>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">{t("me.whoCanFind")}</h2>
        <p className="mb-3 text-sm text-ink-muted">{t("me.whoCanFindNote")}</p>
        <VisibilityPicker profile={profile} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          {donations ? t("me.historyCount", { count: donations.length }) : t("me.history")}
        </h2>
        {donations === null ? (
          <p className="text-ink-muted">{t("publicSite.loadingEllipsis")}</p>
        ) : donations.length === 0 ? (
          <p className="text-ink-muted">{t("me.noDonations")}</p>
        ) : (
          <Surface>
            <ul className="divide-y divide-line">
              {donations.map(donation => (
                <li key={donation.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-semibold">{formatDate(donation.date)}</p>
                    <p className="text-sm text-ink-muted">{donation.hospital || t("donation.hospitalNotRecorded")}</p>
                  </div>
                  <Droplet className="size-5 fill-blood-tint text-blood" />
                </li>
              ))}
            </ul>
          </Surface>
        )}
      </section>

      <footer className="flex flex-wrap gap-6 border-t border-line pt-6 text-sm">
        <Link href="/privacy" className="text-ink-muted hover:text-ink">{t("publicSite.privacyPolicy")}</Link>
        <Link href="/delete-account" className="text-blood hover:underline">{t("me.deleteMyAccount")}</Link>
      </footer>
    </div>
  );
}

function LogDonationForm({ onDone }: { onDone: () => void }) {
  const { profile } = useAuth();
  const { t, formatDate } = useI18n();
  const [date, setDate] = useState(toDateValue());
  const [hospital, setHospital] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const donationDate = fromDateInput(date);
    if (!donationDate) return setError(t("me.log.enterDate"));
    if (donationDate > new Date()) return setError(t("me.log.futureDate"));

    // Two donations closer than the cool-off period usually means a mistake.
    const last = profile.lastDonation;
    if (last && donationDate < addMonths(last, COOLOFF_MONTHS) && last < addMonths(donationDate, COOLOFF_MONTHS)) {
      const ok = window.confirm(
        t("me.log.cooloffConfirm", { date: formatDate(last), months: COOLOFF_MONTHS }),
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
      setError(t("me.couldNotSave"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">{t("me.log.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("me.log.date")} type="date" required max={toDateValue()} value={date} onChange={e => setDate(e.target.value)} />
          <Field
            label={t("me.log.hospital")}
            value={hospital}
            onChange={e => setHospital(e.target.value)}
          />
        </div>
        {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={saving}>{t("me.log.save")}</Button>
          <Button type="button" variant="quiet" onClick={onDone}>{t("common.cancel")}</Button>
        </div>
      </form>
    </Surface>
  );
}

function Detail({ label, value }: { label: StringKey; value?: string }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 px-4 py-3">
      <dt className="text-ink-muted">{t(label)}</dt>
      <dd className="font-medium">{value || t("common.notAdded")}</dd>
    </div>
  );
}
