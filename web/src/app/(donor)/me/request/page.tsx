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
import { useI18n, type StringKey } from "@/i18n";

type Urgency = BloodRequest["urgency"];

const URGENCY_OPTIONS: { value: Urgency; label: StringKey }[] = [
  { value: "high", label: "urgency.high" },
  { value: "medium", label: "urgency.medium" },
  { value: "low", label: "urgency.low" },
];

export default function RequestBloodPage() {
  const { profile } = useAuth();
  const { t, districtName } = useI18n();
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

    if (!form.patientName.trim()) return setError(t("myRequest.missingPatient"));
    if (!form.bloodType) return setError(t("myRequest.missingBloodType"));
    if (!/^\d+$/.test(form.units.trim()) || units < 1) return setError(t("myRequest.invalidUnits"));
    if (!form.urgency) return setError(t("myRequest.missingUrgency"));
    if (!form.hospital.trim()) return setError(t("myRequest.missingHospital"));
    if (!form.district) return setError(t("myRequest.missingDistrict"));
    if (!form.location.trim()) return setError(t("myRequest.missingArea"));
    if (!contactNumber) return setError(t("myRequest.invalidPhone"));

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
      setError(t("myRequest.couldNotPost"));
    } finally {
      setSaving(false);
    }
  };

  if (postedId) {
    return (
      <Surface className="space-y-3 p-6">
        <CheckCircle2 className="size-8 text-leaf" />
        <h1 className="text-2xl font-bold">{t("myRequest.posted.title")}</h1>
        <p className="text-ink-muted">
          {t("myRequest.posted.message", { bloodType: form.bloodType, phone: form.contactNumber })}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/me/donors?request=${postedId}`}>{t("myRequest.findDonorsNow")}</ButtonLink>
          <ButtonLink href="/me" variant="secondary">{t("myRequest.backToPage")}</ButtonLink>
        </div>
      </Surface>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/me", label: t("me.backToPage") }}
        title={t("publicSite.requestBlood")}
        subtitle={t("myRequest.subtitle")}
      />
      <Surface className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label={t("myRequest.patientName")} value={form.patientName} onChange={e => set({ patientName: e.target.value })} />
          <Segmented
            label={t("myRequest.bloodGroup")}
            options={BLOOD_TYPES.map(type => ({ value: type, label: type }))}
            value={form.bloodType}
            onChange={bloodType => set({ bloodType })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t("myRequest.units")}
              inputMode="numeric"
              value={form.units}
              onChange={e => set({ units: e.target.value })}
            />
            <Segmented
              label={t("myRequest.urgency")}
              options={URGENCY_OPTIONS.map(option => ({ value: option.value, label: t(option.label) }))}
              value={form.urgency}
              onChange={urgency => set({ urgency: urgency as Urgency })}
            />
          </div>
          <Field label={t("myRequest.hospital")} value={form.hospital} onChange={e => set({ hospital: e.target.value })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label={t("myRequest.district")}
              value={form.district}
              onChange={district => set({ district })}
              placeholder={t("myRequest.selectDistrict")}
              options={KERALA_DISTRICTS.map(district => ({ value: district, label: districtName(district) }))}
            />
            <Field
              label={t("myRequest.area")}
              value={form.location}
              onChange={e => set({ location: e.target.value })}
              placeholder={t("myRequest.areaPlaceholder")}
            />
          </div>
          <Field
            label={t("myRequest.contact")}
            type="tel"
            inputMode="tel"
            value={form.contactNumber}
            onChange={e => set({ contactNumber: e.target.value })}
            hint={t("myRequest.contactHint")}
          />
          {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
          <Button type="submit" icon={Send} loading={saving} className="w-full sm:w-auto">{t("myRequest.submit")}</Button>
        </form>
      </Surface>
    </>
  );
}
