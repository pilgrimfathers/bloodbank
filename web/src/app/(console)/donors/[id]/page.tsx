"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import {
  MessageCircle, Pencil, Phone, ShieldCheck, ShieldOff, Trash2, UserCheck, UserRoundX, UserX, Droplet,
} from "lucide-react";
import { COOLOFF_MONTHS, KERALA_DISTRICTS } from "@shared/constants";
import { addMonths } from "@shared/eligibility";
import { formatDate } from "@shared/format";
import type { Donation, UserProfile, UserRole } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { coversDistrict, deleteDonation, getDonations, getUser, logDonation } from "@/lib/data";
import { DonorRing } from "@/components/eligibility";
import {
  DonorForm, DonorFormError, findDuplicateDonor, fromDateInput, toDateValue, type DonorFormValues,
} from "@/components/donor-form";
import { Button, EmptyState, Field, PageHeader, Pill, Segmented, Spinner, Surface, cx } from "@/components/ui";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "donor", label: "Donor" },
  { value: "volunteer", label: "Volunteer" },
  { value: "admin", label: "Admin" },
];

export default function DonorPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <DonorDetail />
    </Suspense>
  );
}

function DonorDetail() {
  const { id } = useParams<{ id: string }>();
  const requestId = useSearchParams().get("requestId");
  const { profile: me } = useAuth();
  const [donor, setDonor] = useState<UserProfile | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchDonor>>) => {
    setStatus(result.status);
    if (result.status === "ready") {
      setDonor(result.donor);
      setDonations(result.donations);
    }
  }, []);

  // Reload after changes such as logging or deleting a donation.
  const load = useCallback(async () => apply(await fetchDonor(id)), [apply, id]);

  useEffect(() => {
    let cancelled = false;
    fetchDonor(id).then(result => { if (!cancelled) apply(result); });
    return () => { cancelled = true; };
  }, [apply, id]);

  if (status === "loading" || !me) return <Spinner label="Loading donor" />;
  if (status === "missing") {
    return (
      <>
        <PageHeader back={{ href: "/donors", label: "All donors" }} title="Donor" />
        <EmptyState icon={UserRoundX} title="This donor no longer exists" />
      </>
    );
  }
  if (status === "error" || !donor) {
    return (
      <>
        <PageHeader back={{ href: "/donors", label: "All donors" }} title="Donor" />
        <p role="alert" className="rounded-lg bg-blood-tint px-4 py-3 text-blood">
          Could not load this donor. Check your connection and reload the page.
        </p>
      </>
    );
  }

  const canManage = coversDistrict(me, donor.district);
  const isAdmin = me.role === "admin";
  const phone = donor.phoneNumber?.replace(/\D/g, "").slice(-10);
  const place = [donor.area, donor.district].filter(Boolean).join(", ") || "No district set";

  const update = async (patch: Partial<UserProfile>, success?: string) => {
    setMessage(null);
    try {
      await updateDoc(doc(firestore, "users", donor.id), { ...patch, updatedAt: new Date() });
      setDonor({ ...donor, ...patch });
      if (success) setMessage(success);
    } catch (error) {
      console.error("Error updating donor:", error);
      setMessage("Could not update donor. Check your connection and try again.");
    }
  };

  const toggleActive = async () => {
    const deactivating = donor.status !== "inactive";
    const ok = window.confirm(deactivating
      ? `Deactivate ${donor.name}? They will be hidden from eligible donor searches.`
      : `Reactivate ${donor.name}? They will show up in donor searches again.`);
    if (ok) await update({ status: deactivating ? "inactive" : "active" });
  };

  const handleEdit = async (values: DonorFormValues) => {
    if (!coversDistrict(me, values.district)) {
      throw new DonorFormError(`You don't manage donors in ${values.district}.`);
    }
    const duplicate = await findDuplicateDonor(values, donor.id);
    if (duplicate && !window.confirm(
      `${duplicate.name ?? "Another donor"} in ${values.district} already uses ${values.phoneNumber}. Save anyway?`,
    )) return;

    // Last donation comes from donation records, never from the edit form.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lastDonation, ...details } = values;
    await updateDoc(doc(firestore, "users", donor.id), { ...details, updatedAt: new Date() });
    setDonor({ ...donor, ...details });
    setEditing(false);
    setMessage("Donor details saved.");
  };

  const handleDelete = async (donation: Donation) => {
    if (!window.confirm(`Delete the donation on ${formatDate(donation.date)}?`)) return;
    try {
      await deleteDonation(donation);
      await load();
    } catch (error) {
      console.error("Error deleting donation:", error);
      setMessage("Could not delete donation. Check your connection and try again.");
    }
  };

  return (
    <>
      <PageHeader back={{ href: "/donors", label: "All donors" }} title={donor.name} subtitle={place} />

      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone="info">{ROLE_OPTIONS.find(r => r.value === (donor.role ?? "donor"))?.label}</Pill>
        <Pill tone={donor.verified ? "leaf" : "muted"}>{donor.verified ? "Verified" : "Unverified"}</Pill>
        {!donor.isDonor && <Pill tone="turmeric">Unavailable</Pill>}
        {donor.status === "inactive" && <Pill tone="muted">Inactive</Pill>}
        {donor.hasAccount === false && <Pill tone="kasavu">No app</Pill>}
        {donor.visibility === "public" && <Pill tone="leaf">Public</Pill>}
        {donor.visibility === "public_phone" && <Pill tone="leaf">Public with number</Pill>}
      </div>

      {message && (
        <p role="status" className="mb-6 rounded-lg bg-info-tint px-4 py-3 text-info">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Surface className="p-6">
            <DonorRing
              bloodType={donor.bloodType}
              lastDonation={donor.lastDonation}
              donationCount={donor.donationCount ?? donations.length}
            />
          </Surface>

          {editing ? (
            <Surface className="p-6">
              <h2 className="mb-4 text-xl font-semibold">Edit details</h2>
              <DonorForm
                initial={donor}
                showNotes
                submitLabel="Save changes"
                onSubmit={handleEdit}
                onCancel={() => setEditing(false)}
              />
            </Surface>
          ) : (
            <Surface>
              <dl className="divide-y divide-line">
                <Detail label="Phone">
                  {donor.phoneNumber
                    ? <a href={`tel:${donor.phoneNumber}`} className="hover:text-blood">{donor.phoneNumber}</a>
                    : "No phone number"}
                </Detail>
                {donor.email && <Detail label="Email">{donor.email}</Detail>}
                <Detail label="Address">{donor.address || "Not added"}</Detail>
                <Detail label="Medical conditions">{donor.medicalConditions || "None noted"}</Detail>
                {donor.notes && <Detail label="Volunteer notes">{donor.notes}</Detail>}
                <Detail label="Added on">{formatDate(donor.createdAt)}</Detail>
              </dl>
            </Surface>
          )}

          <section>
            <h2 className="mb-3 text-xl font-semibold">Donation history</h2>
            {donations.length === 0 ? (
              <EmptyState icon={Droplet} title="No donations recorded yet" />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full min-w-[520px] text-left">
                  <thead className="border-b border-line text-sm text-ink-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Hospital</th>
                      <th className="px-4 py-3 font-medium">Logged by</th>
                      {canManage && <th className="px-4 py-3"><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map(donation => (
                      <tr key={donation.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{formatDate(donation.date)}</td>
                        <td className="px-4 py-3">{donation.hospital || <span className="text-ink-faint">Not recorded</span>}</td>
                        <td className="px-4 py-3 text-ink-muted">{donation.recordedByName || "-"}</td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(donation)}
                              aria-label={`Delete donation on ${formatDate(donation.date)}`}
                              className="rounded p-1 text-ink-faint hover:bg-blood-tint hover:text-blood"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {phone && (
            <Surface className="grid grid-cols-2 gap-2 p-4">
              <a
                href={`tel:${phone}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blood px-4 font-semibold text-white hover:bg-blood-dark"
              >
                <Phone className="size-4" />
                Call
              </a>
              <a
                href={`https://wa.me/91${phone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-[1.5px] border-leaf/40 px-4 font-semibold text-leaf hover:bg-leaf-tint"
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Surface>
          )}

          {canManage && (
            <LogDonation
              donor={donor}
              donations={donations}
              requestId={requestId}
              recorder={{ id: me.id, name: me.name }}
              onLogged={async () => {
                await load();
                setMessage(`Donation logged. ${donor.name} can give again after ${COOLOFF_MONTHS} months.`);
              }}
            />
          )}

          {canManage && (
            <Surface className="space-y-2 p-4">
              <h2 className="mb-1 font-semibold">Manage donor</h2>
              {!editing && (
                <Button variant="secondary" icon={Pencil} className="w-full" onClick={() => setEditing(true)}>
                  Edit details
                </Button>
              )}
              <Button
                variant="secondary"
                icon={donor.verified ? ShieldOff : ShieldCheck}
                className="w-full"
                onClick={() => update(
                  { verified: !donor.verified },
                  donor.verified ? `${donor.name} is no longer verified.` : `${donor.name} is verified.`,
                )}
              >
                {donor.verified ? "Remove verification" : "Mark as verified"}
              </Button>
              <Button
                variant={donor.status === "inactive" ? "secondary" : "danger"}
                icon={donor.status === "inactive" ? UserCheck : UserX}
                className="w-full"
                onClick={toggleActive}
              >
                {donor.status === "inactive" ? "Reactivate donor" : "Deactivate donor"}
              </Button>
            </Surface>
          )}

          {isAdmin && donor.id !== me.id && donor.hasAccount !== false && (
            <AccessCard
              donor={donor}
              onSave={(patch, success) => update(patch, success)}
            />
          )}
        </aside>
      </div>
    </>
  );
}

async function fetchDonor(id: string) {
  try {
    const donor = await getUser(id);
    if (!donor) return { status: "missing" as const };
    return { status: "ready" as const, donor, donations: await getDonations(id) };
  } catch (error) {
    console.error("Error loading donor:", error);
    return { status: "error" as const };
  }
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  );
}

function LogDonation({ donor, donations, requestId, recorder, onLogged }: {
  donor: UserProfile;
  donations: Donation[];
  requestId: string | null;
  recorder: { id: string; name: string };
  onLogged: () => Promise<void>;
}) {
  const [date, setDate] = useState(toDateValue());
  const [hospital, setHospital] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const donationDate = fromDateInput(date);
    if (!donationDate) return setError("Enter a valid donation date.");
    if (donationDate > new Date()) return setError("Donation date cannot be in the future.");

    // Two donations closer than the cool-off period usually means a mistake.
    const tooClose = donations.find(d =>
      donationDate < addMonths(d.date, COOLOFF_MONTHS) && d.date < addMonths(donationDate, COOLOFF_MONTHS),
    );
    if (tooClose && !window.confirm(
      `${donor.name} already has a donation on ${formatDate(tooClose.date)}, less than ${COOLOFF_MONTHS} months apart. Record anyway?`,
    )) return;

    setSaving(true);
    try {
      await logDonation(donor, { date: donationDate, hospital, requestId }, recorder);
      setHospital("");
      setDate(toDateValue());
      await onLogged();
    } catch (err) {
      console.error("Error logging donation:", err);
      setError("Could not log donation. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="font-semibold">Log a donation</h2>
          {requestId && <p className="text-sm text-info">This donation will be linked to the request.</p>}
        </div>
        <Field label="Donation date" type="date" max={toDateValue()} value={date} onChange={e => setDate(e.target.value)} required />
        <Field label="Hospital or blood bank (optional)" value={hospital} onChange={e => setHospital(e.target.value)} />
        {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
        <Button type="submit" icon={Droplet} loading={saving} className="w-full">Log donation</Button>
      </form>
    </Surface>
  );
}

function AccessCard({ donor, onSave }: {
  donor: UserProfile;
  onSave: (patch: Partial<UserProfile>, success: string) => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(donor.role ?? "donor");
  const [districts, setDistricts] = useState<string[]>(donor.volunteerDistricts ?? []);
  const [saving, setSaving] = useState(false);

  const toggle = (district: string) =>
    setDistricts(prev => (prev.includes(district) ? prev.filter(d => d !== district) : [...prev, district]));

  const save = async () => {
    setSaving(true);
    const label = ROLE_OPTIONS.find(r => r.value === role)!.label.toLowerCase();
    await onSave(
      { role, volunteerDistricts: role === "volunteer" ? districts : [] },
      `${donor.name} is now ${role === "admin" ? "an admin" : `a ${label}`}.`,
    );
    setSaving(false);
  };

  return (
    <Surface className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">Access</h2>
        <p className="text-sm text-ink-muted">Only admins can change roles.</p>
      </div>
      <Segmented options={ROLE_OPTIONS} value={role} onChange={value => setRole(value as UserRole)} />
      {role === "volunteer" && (
        <fieldset>
          <legend className="mb-1.5 text-sm text-ink-muted">
            Districts they manage. Leave all unselected for the whole of Kerala.
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {KERALA_DISTRICTS.map(district => {
              const selected = districts.includes(district);
              return (
                <button
                  key={district}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(district)}
                  className={cx(
                    "h-8 rounded-full border-[1.5px] px-3 text-sm transition-colors",
                    selected ? "border-info bg-info text-white" : "border-line bg-surface hover:border-ink-faint",
                  )}
                >
                  {district}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <Button variant="secondary" loading={saving} className="w-full" onClick={save}>Save access</Button>
    </Surface>
  );
}
