"use client";

import { useState, type FormEvent } from "react";
import { addDoc, collection } from "firebase/firestore";
import { CheckCircle2, Send } from "lucide-react";
import { BLOOD_TYPES, KERALA_DISTRICTS } from "@shared/constants";
import { normalizePhone } from "@shared/format";
import { NOTIFY_ENDPOINTS } from "@shared/notifications";
import type { BloodRequest } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { callNotifyApi } from "@/lib/data";
import { Button, ButtonLink, Field, PageHeader, Segmented, Select, Surface } from "@/components/ui";

type Urgency = BloodRequest["urgency"];

const URGENCY_OPTIONS = [
  { value: "high", label: "Urgent" },
  { value: "medium", label: "Needed soon" },
  { value: "low", label: "Planned" },
];

export default function RequestBloodPage() {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    patientName: "",
    bloodType: "",
    units: "1",
    urgency: "" as Urgency | "",
    hospital: "",
    district: profile?.district ?? "",
    location: "",
    contactNumber: profile?.phoneNumber ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postedId, setPostedId] = useState<string | null>(null);

  if (!profile) return null;
  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const units = Number(form.units);
    const contactNumber = normalizePhone(form.contactNumber);

    if (!form.patientName.trim()) return setError("Enter the patient's name.");
    if (!form.bloodType) return setError("Select the blood group needed.");
    if (!/^\d+$/.test(form.units.trim()) || units < 1) return setError("Enter the number of units needed, for example 2.");
    if (!form.urgency) return setError("Select how soon the blood is needed.");
    if (!form.hospital.trim()) return setError("Enter the hospital name.");
    if (!form.district) return setError("Select the district of the hospital.");
    if (!form.location.trim()) return setError("Enter the area or town of the hospital.");
    if (!contactNumber) return setError("Enter a 10-digit Indian mobile number donors can call.");

    setSaving(true);
    setError(null);
    try {
      const request: Omit<BloodRequest, "id"> = {
        requesterId: profile.id,
        requesterName: profile.name || "Anonymous",
        patientName: form.patientName.trim(),
        bloodType: form.bloodType,
        units,
        urgency: form.urgency,
        hospital: form.hospital.trim(),
        district: form.district,
        location: form.location.trim(),
        status: "open",
        createdAt: new Date(),
        contactNumber,
      };
      const ref = await addDoc(collection(firestore, "bloodRequests"), request);
      // Alert admins in the background; posting must not depend on it.
      callNotifyApi(NOTIFY_ENDPOINTS.requestCreated, { requestId: ref.id })
        .catch(err => console.warn("Could not alert admins:", err));
      setPostedId(ref.id);
    } catch (err) {
      console.error("Error creating request:", err);
      setError("Could not post the request. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (postedId) {
    return (
      <Surface className="space-y-3 p-6">
        <CheckCircle2 className="size-8 text-leaf" />
        <h1 className="text-2xl font-bold">Request posted</h1>
        <p className="text-ink-muted">
          Volunteers have been alerted and will call donors with {form.bloodType} blood. They may call you on{" "}
          {form.contactNumber} for details.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/me/donors?request=${postedId}`}>Find donors now</ButtonLink>
          <ButtonLink href="/me" variant="secondary">Back to my page</ButtonLink>
        </div>
      </Surface>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/me", label: "My donor page" }}
        title="Request blood"
        subtitle="Volunteers will call donors who match."
      />
      <Surface className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Patient name" value={form.patientName} onChange={e => set({ patientName: e.target.value })} />
          <Segmented
            label="Blood group needed"
            options={BLOOD_TYPES.map(type => ({ value: type, label: type }))}
            value={form.bloodType}
            onChange={bloodType => set({ bloodType })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Units needed"
              inputMode="numeric"
              value={form.units}
              onChange={e => set({ units: e.target.value })}
            />
            <Segmented
              label="How soon"
              options={URGENCY_OPTIONS}
              value={form.urgency}
              onChange={urgency => set({ urgency: urgency as Urgency })}
            />
          </div>
          <Field label="Hospital" value={form.hospital} onChange={e => set({ hospital: e.target.value })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="District"
              value={form.district}
              onChange={district => set({ district })}
              placeholder="Select district"
              options={KERALA_DISTRICTS.map(district => ({ value: district, label: district }))}
            />
            <Field
              label="Area or town"
              value={form.location}
              onChange={e => set({ location: e.target.value })}
              placeholder="e.g. Kanhangad"
            />
          </div>
          <Field
            label="Contact number"
            type="tel"
            inputMode="tel"
            value={form.contactNumber}
            onChange={e => set({ contactNumber: e.target.value })}
            hint="Donors and volunteers will call this number"
          />
          {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
          <Button type="submit" icon={Send} loading={saving} className="w-full sm:w-auto">Post request</Button>
        </form>
      </Surface>
    </>
  );
}
