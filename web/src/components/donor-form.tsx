"use client";

import { useState, type FormEvent } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { BLOOD_TYPES, KERALA_DISTRICTS } from "@shared/constants";
import { normalizePhone } from "@shared/format";
import type { UserProfile } from "@shared/types";
import { firestore } from "@/lib/firebase";
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
const DISTRICT_OPTIONS = KERALA_DISTRICTS.map(district => ({ value: district, label: district }));

export function DonorForm({ initial, showLastDonation, showNotes, submitLabel, onSubmit, onCancel }: Props) {
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
    if (!form.name.trim()) return setError("Enter the donor's full name.");
    if (!phoneNumber) return setError("Enter a 10-digit Indian mobile number.");
    if (!form.bloodType) return setError("Choose a blood type.");
    if (!form.district) return setError("Choose a district.");

    let lastDonation: Date | null = null;
    if (showLastDonation && form.lastDonation) {
      lastDonation = fromDateInput(form.lastDonation);
      if (!lastDonation) return setError("Enter a valid last donation date.");
      if (lastDonation > new Date()) return setError("Last donation date cannot be in the future.");
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
        setError("Could not save donor. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" value={form.name} onChange={e => set({ name: e.target.value })} required />
        <Field
          label="Phone number"
          type="tel"
          inputMode="tel"
          placeholder="10-digit mobile number"
          value={form.phoneNumber}
          onChange={e => set({ phoneNumber: e.target.value })}
          required
        />
      </div>
      <Segmented label="Blood type" options={BLOOD_OPTIONS} value={form.bloodType} onChange={bloodType => set({ bloodType })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="District"
          options={DISTRICT_OPTIONS}
          value={form.district}
          onChange={district => set({ district })}
          placeholder="Choose a district"
        />
        <Field
          label="Area or town (optional)"
          placeholder="e.g. Kanhangad, Edappally"
          value={form.area}
          onChange={e => set({ area: e.target.value })}
        />
      </div>
      <TextArea label="Address (optional)" value={form.address} onChange={e => set({ address: e.target.value })} rows={2} />
      {showLastDonation && (
        <Field
          label="Last donation date (optional)"
          type="date"
          max={toDateValue()}
          value={form.lastDonation}
          onChange={e => set({ lastDonation: e.target.value })}
          hint="Leave empty if they have never donated"
          className="sm:max-w-xs"
        />
      )}
      <TextArea
        label="Medical conditions (optional)"
        value={form.medicalConditions}
        onChange={e => set({ medicalConditions: e.target.value })}
        rows={2}
      />
      {showNotes && (
        <TextArea
          label="Volunteer notes (optional)"
          value={form.notes}
          onChange={e => set({ notes: e.target.value })}
          hint="Not shown to the donor in the app"
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
          <span className="block font-medium">Available to donate</span>
          <span className="block text-sm text-ink-muted">Turn off to stop volunteers calling for requests</span>
        </span>
      </label>

      {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="quiet" onClick={onCancel}>Cancel</Button>}
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
