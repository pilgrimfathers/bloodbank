"use client";

import { useState, type FormEvent } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { BLOOD_TYPES, KERALA_DISTRICTS } from "@shared/constants";
import { normalizePhone } from "@shared/format";
import type { UserProfile } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useI18n } from "@/i18n";
import { Button, Field, Segmented, Select, TextArea } from "./ui";

export type DonorFormValues = {
  name: string;
  phoneNumber: string;
  bloodType: string;
  district: string;
  area: string;
  address: string;
  medicalConditions: string;
  isDonor: boolean;
  notes: string;
  lastDonation: Date | null;
};

type Props = {
  initial?: Partial<UserProfile>;
  // Last donation is only entered once; after that it comes from donation records.
  showLastDonation?: boolean;
  showNotes?: boolean;
  submitLabel: string;
  onSubmit: (values: DonorFormValues) => Promise<void>;
  onCancel?: () => void;
};

// Thrown from onSubmit to show a specific message in the form.
export class DonorFormError extends Error {}

// <input type="date"> works in YYYY-MM-DD; convert as a local date, not UTC.
export function fromDateInput(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  return new Date(y, m - 1, d);
}

export function toDateValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const BLOOD_OPTIONS = BLOOD_TYPES.map(type => ({ value: type, label: type }));

export function DonorForm({ initial, showLastDonation, showNotes, submitLabel, onSubmit, onCancel }: Props) {
  const { t, districtName } = useI18n();
  // Values stay in English; only the label follows the language.
  const districtOptions = KERALA_DISTRICTS.map(district => ({ value: district, label: districtName(district) }));
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    phoneNumber: initial?.phoneNumber ?? "",
    bloodType: initial?.bloodType ?? "",
    district: initial?.district ?? "",
    area: initial?.area ?? "",
    address: initial?.address ?? "",
    medicalConditions: initial?.medicalConditions ?? "",
    isDonor: initial?.isDonor ?? true,
    notes: initial?.notes ?? "",
    lastDonation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const phoneNumber = normalizePhone(form.phoneNumber);
    if (!form.name.trim()) return setError(t("donorForm.enterName"));
    if (!phoneNumber) return setError(t("donorForm.enterPhone"));
    if (!form.bloodType) return setError(t("donorForm.chooseBloodType"));
    if (!form.district) return setError(t("donorForm.chooseDistrict"));

    let lastDonation: Date | null = null;
    if (showLastDonation && form.lastDonation) {
      lastDonation = fromDateInput(form.lastDonation);
      if (!lastDonation) return setError(t("donorForm.lastDateInvalid"));
      if (lastDonation > new Date()) return setError(t("donorForm.lastDateFuture"));
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        phoneNumber,
        area: form.area.trim(),
        address: form.address.trim(),
        medicalConditions: form.medicalConditions.trim(),
        notes: form.notes.trim(),
        lastDonation,
      });
    } catch (err) {
      if (err instanceof DonorFormError) {
        setError(err.message);
      } else {
        console.error("Error saving donor:", err);
        setError(t("donorForm.couldNotSave"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("donorForm.fullName")} value={form.name} onChange={e => set({ name: e.target.value })} required />
        <Field
          label={t("donorForm.phone")}
          type="tel"
          inputMode="tel"
          placeholder={t("donorForm.phonePlaceholder")}
          value={form.phoneNumber}
          onChange={e => set({ phoneNumber: e.target.value })}
          required
        />
      </div>
      <Segmented label={t("donors.bloodType")} options={BLOOD_OPTIONS} value={form.bloodType} onChange={bloodType => set({ bloodType })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label={t("donors.district")}
          options={districtOptions}
          value={form.district}
          onChange={district => set({ district })}
          placeholder={t("donorForm.districtPlaceholder")}
        />
        <Field
          label={t("donorForm.area")}
          placeholder={t("donorForm.areaPlaceholder")}
          value={form.area}
          onChange={e => set({ area: e.target.value })}
        />
      </div>
      <TextArea label={t("donorForm.address")} value={form.address} onChange={e => set({ address: e.target.value })} rows={2} />
      {showLastDonation && (
        <Field
          label={t("donorForm.lastDonation")}
          type="date"
          max={toDateValue()}
          value={form.lastDonation}
          onChange={e => set({ lastDonation: e.target.value })}
          hint={t("donorForm.lastDonationHint")}
          className="sm:max-w-xs"
        />
      )}
      <TextArea
        label={t("donorForm.medical")}
        value={form.medicalConditions}
        onChange={e => set({ medicalConditions: e.target.value })}
        rows={2}
      />
      {showNotes && (
        <TextArea
          label={t("donorForm.notes")}
          value={form.notes}
          onChange={e => set({ notes: e.target.value })}
          hint={t("donorForm.notesHint")}
          rows={2}
        />
      )}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={form.isDonor}
          onChange={e => set({ isDonor: e.target.checked })}
          className="mt-1 size-4 accent-[var(--color-leaf)]"
        />
        <span>
          <span className="block font-medium">{t("donorForm.available")}</span>
          <span className="block text-sm text-ink-muted">{t("donorForm.availableHint")}</span>
        </span>
      </label>

      {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="quiet" onClick={onCancel}>{t("common.cancel")}</Button>}
      </div>
    </form>
  );
}

// Another donor in the same district with this phone, if any. Scoped to the
// district so district-limited volunteers pass the security rules.
export async function findDuplicateDonor(values: DonorFormValues, excludeId?: string) {
  const snap = await getDocs(query(
    collection(firestore, "users"),
    where("phoneNumber", "==", values.phoneNumber),
    where("district", "==", values.district),
  ));
  const match = snap.docs.find(d => d.id !== excludeId);
  return match ? (match.data() as { name?: string }) : null;
}
