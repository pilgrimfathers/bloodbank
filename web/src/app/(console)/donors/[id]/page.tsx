"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import {
  Combine, MessageCircle, Pencil, Phone, Search, ShieldCheck, ShieldOff, Trash2, UserCheck, UserRoundX, UserX, Droplet,
} from "lucide-react";
import { COOLOFF_MONTHS, KERALA_DISTRICTS } from "@shared/constants";
import { DONOR_ENDPOINTS, type MergeDonorResult } from "@shared/donors";
import { addMonths } from "@shared/eligibility";
import type { Donation, UserProfile, UserRole } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import {
  callNotifyApi, coversDistrict, deleteAddedDonor, deleteDonation, getDonations, getUser, logDonation, mapUser,
} from "@/lib/data";
import { DonorRing } from "@/components/eligibility";
import {
  DonorForm, DonorFormError, findDuplicateDonor, fromDateInput, toDateValue, type DonorFormValues,
} from "@/components/donor-form";
import { Button, EmptyState, Field, PageHeader, Pill, Segmented, Spinner, Surface, cx } from "@/components/ui";
import { useI18n, type StringKey } from "@/i18n";

const ROLE_OPTIONS: { value: UserRole; label: StringKey; success: StringKey }[] = [
  { value: "donor", label: "role.donor", success: "donorPage.nowDonor" },
  { value: "volunteer", label: "role.volunteer", success: "donorPage.nowVolunteer" },
  { value: "admin", label: "role.admin", success: "donorPage.nowAdmin" },
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
  const router = useRouter();
  const requestId = useSearchParams().get("requestId");
  const { profile: me } = useAuth();
  const { t, formatDate, districtName } = useI18n();
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

  if (status === "loading" || !me) return <Spinner label={t("donorPage.loading")} />;
  if (status === "missing") {
    return (
      <>
        <PageHeader back={{ href: "/donors", label: t("donors.allDonors") }} title={t("role.donor")} />
        <EmptyState icon={UserRoundX} title={t("donorPage.notFound")} />
      </>
    );
  }
  if (status === "error" || !donor) {
    return (
      <>
        <PageHeader back={{ href: "/donors", label: t("donors.allDonors") }} title={t("role.donor")} />
        <p role="alert" className="rounded-lg bg-blood-tint px-4 py-3 text-blood">
          {t("donorPage.couldNotLoad")}
        </p>
      </>
    );
  }

  const canManage = coversDistrict(me, donor.district);
  const isAdmin = me.role === "admin";
  const phone = donor.phoneNumber?.replace(/\D/g, "").slice(-10);
  const place = [donor.area, districtName(donor.district)].filter(Boolean).join(", ") || t("donors.noDistrictSet");

  const update = async (patch: Partial<UserProfile>, success?: string) => {
    setMessage(null);
    try {
      await updateDoc(doc(firestore, "users", donor.id), { ...patch, updatedAt: new Date() });
      setDonor({ ...donor, ...patch });
      if (success) setMessage(success);
    } catch (error) {
      console.error("Error updating donor:", error);
      setMessage(t("donorPage.couldNotUpdate"));
    }
  };

  const toggleActive = async () => {
    const deactivating = donor.status !== "inactive";
    const ok = window.confirm(deactivating
      ? t("donorPage.deactivateConfirm", { name: donor.name })
      : t("donorPage.reactivateConfirm", { name: donor.name }));
    if (ok) await update({ status: deactivating ? "inactive" : "active" });
  };

  const handleEdit = async (values: DonorFormValues) => {
    if (!coversDistrict(me, values.district)) {
      throw new DonorFormError(t("donorForm.notYourDistrict", { district: districtName(values.district) }));
    }
    const duplicate = await findDuplicateDonor(values, donor.id);
    if (duplicate && !window.confirm(
      t("donorForm.duplicate", {
        name: duplicate.name ?? t("donorForm.anotherDonor"),
        district: districtName(values.district),
        phone: values.phoneNumber,
      }),
    )) return;

    // Last donation comes from donation records, never from the edit form.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lastDonation, ...details } = values;
    await updateDoc(doc(firestore, "users", donor.id), { ...details, updatedAt: new Date() });
    setDonor({ ...donor, ...details });
    setEditing(false);
    setMessage(t("donorPage.saved"));
  };

  const handleDeleteDonor = async () => {
    if (!window.confirm(
      t("donorPage.deleteDonorConfirm", { name: donor.name, count: donations.length }),
    )) return;
    try {
      await deleteAddedDonor(donor);
      router.replace("/donors");
    } catch (error) {
      console.error("Error deleting donor:", error);
      setMessage(t("donorPage.couldNotDeleteDonor"));
    }
  };

  const handleDelete = async (donation: Donation) => {
    if (!window.confirm(t("donorPage.deleteDonationConfirm", { date: formatDate(donation.date) }))) return;
    try {
      await deleteDonation(donation);
      await load();
    } catch (error) {
      console.error("Error deleting donation:", error);
      setMessage(t("donorPage.couldNotDeleteDonation"));
    }
  };

  return (
    <>
      <PageHeader back={{ href: "/donors", label: t("donors.allDonors") }} title={donor.name} subtitle={place} />

      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone="info">{t(ROLE_OPTIONS.find(r => r.value === (donor.role ?? "donor"))?.label ?? "role.donor")}</Pill>
        <Pill tone={donor.verified ? "leaf" : "muted"}>
          {donor.verified ? t("donors.pill.verified") : t("donors.pill.unverified")}
        </Pill>
        {!donor.isDonor && <Pill tone="turmeric">{t("donors.pill.unavailable")}</Pill>}
        {donor.status === "inactive" && <Pill tone="muted">{t("donors.pill.inactive")}</Pill>}
        {donor.hasAccount === false && <Pill tone="kasavu">{t("donors.pill.noApp")}</Pill>}
        {donor.visibility === "public" && <Pill tone="leaf">{t("donors.pill.public")}</Pill>}
        {donor.visibility === "public_phone" && <Pill tone="leaf">{t("visibility.public_phone.label")}</Pill>}
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
              <h2 className="mb-4 text-xl font-semibold">{t("donorPage.editDetails")}</h2>
              <DonorForm
                initial={donor}
                showNotes
                submitLabel={t("donorPage.saveChanges")}
                onSubmit={handleEdit}
                onCancel={() => setEditing(false)}
              />
            </Surface>
          ) : (
            <Surface>
              <dl className="divide-y divide-line">
                <Detail label={t("donorPage.phone")}>
                  {donor.phoneNumber
                    ? <a href={`tel:${donor.phoneNumber}`} className="hover:text-blood">{donor.phoneNumber}</a>
                    : t("common.noPhone")}
                </Detail>
                {donor.email && <Detail label={t("donorPage.email")}>{donor.email}</Detail>}
                <Detail label={t("donorPage.address")}>{donor.address || t("common.notAdded")}</Detail>
                <Detail label={t("donorPage.medical")}>{donor.medicalConditions || t("donorPage.noneNoted")}</Detail>
                {donor.notes && <Detail label={t("donorPage.volunteerNotes")}>{donor.notes}</Detail>}
                <Detail label={t("donorPage.addedOn")}>{formatDate(donor.createdAt)}</Detail>
              </dl>
            </Surface>
          )}

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t("donorPage.history")}</h2>
            {donations.length === 0 ? (
              <EmptyState icon={Droplet} title={t("eligibility.noDonations")} />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full min-w-[520px] text-left">
                  <thead className="border-b border-line text-sm text-ink-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("donorPage.col.date")}</th>
                      <th className="px-4 py-3 font-medium">{t("donorPage.col.hospital")}</th>
                      <th className="px-4 py-3 font-medium">{t("donorPage.col.loggedBy")}</th>
                      {canManage && <th className="px-4 py-3"><span className="sr-only">{t("donorPage.col.actions")}</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map(donation => (
                      <tr key={donation.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{formatDate(donation.date)}</td>
                        <td className="px-4 py-3">{donation.hospital || <span className="text-ink-faint">{t("donorPage.notRecorded")}</span>}</td>
                        <td className="px-4 py-3 text-ink-muted">{donation.recordedByName || "-"}</td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(donation)}
                              aria-label={t("donorPage.deleteDonationLabel", { date: formatDate(donation.date) })}
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
                {t("common.call")}
              </a>
              <a
                href={`https://wa.me/91${phone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-[1.5px] border-leaf/40 px-4 font-semibold text-leaf hover:bg-leaf-tint"
              >
                <MessageCircle className="size-4" />
                {t("common.whatsapp")}
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
                setMessage(t("donorPage.donationLogged", { name: donor.name, months: COOLOFF_MONTHS }));
              }}
            />
          )}

          {canManage && (
            <Surface className="space-y-2 p-4">
              <h2 className="mb-1 font-semibold">{t("donorPage.manage")}</h2>
              {!editing && (
                <Button variant="secondary" icon={Pencil} className="w-full" onClick={() => setEditing(true)}>
                  {t("donorPage.editDetails")}
                </Button>
              )}
              <Button
                variant="secondary"
                icon={donor.verified ? ShieldOff : ShieldCheck}
                className="w-full"
                onClick={() => update(
                  { verified: !donor.verified },
                  donor.verified
                    ? t("donorPage.nowUnverified", { name: donor.name })
                    : t("donorPage.nowVerified", { name: donor.name }),
                )}
              >
                {donor.verified ? t("donorPage.removeVerification") : t("donorPage.markVerified")}
              </Button>
              <Button
                variant={donor.status === "inactive" ? "secondary" : "danger"}
                icon={donor.status === "inactive" ? UserCheck : UserX}
                className="w-full"
                onClick={toggleActive}
              >
                {donor.status === "inactive" ? t("donorPage.reactivateDonor") : t("donorPage.deactivateDonor")}
              </Button>
              {isAdmin && donor.hasAccount === false && (
                <Button variant="danger" icon={Trash2} className="w-full" onClick={handleDeleteDonor}>
                  {t("donorPage.deleteDonor")}
                </Button>
              )}
            </Surface>
          )}

          {isAdmin && donor.hasAccount === false && (
            <MergeCard donor={donor} onMerged={intoId => router.replace(`/donors/${intoId}`)} />
          )}

          {isAdmin && donor.hasAccount !== false && <AddedRecordsCard donor={donor} />}

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
  const { t, formatDate } = useI18n();
  const [date, setDate] = useState(toDateValue());
  const [hospital, setHospital] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const donationDate = fromDateInput(date);
    if (!donationDate) return setError(t("donorPage.log.invalidDate"));
    if (donationDate > new Date()) return setError(t("donorPage.log.futureDate"));

    // Two donations closer than the cool-off period usually means a mistake.
    const tooClose = donations.find(d =>
      donationDate < addMonths(d.date, COOLOFF_MONTHS) && d.date < addMonths(donationDate, COOLOFF_MONTHS),
    );
    if (tooClose && !window.confirm(
      t("donorPage.log.tooClose", { name: donor.name, date: formatDate(tooClose.date), months: COOLOFF_MONTHS }),
    )) return;

    setSaving(true);
    try {
      await logDonation(donor, { date: donationDate, hospital, requestId }, recorder);
      setHospital("");
      setDate(toDateValue());
      await onLogged();
    } catch (err) {
      console.error("Error logging donation:", err);
      setError(t("donorPage.log.couldNotLog"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="font-semibold">{t("donorPage.log.title")}</h2>
          {requestId && <p className="text-sm text-info">{t("donorPage.log.linked")}</p>}
        </div>
        <Field label={t("donorPage.log.date")} type="date" max={toDateValue()} value={date} onChange={e => setDate(e.target.value)} required />
        <Field label={t("donorPage.log.hospital")} value={hospital} onChange={e => setHospital(e.target.value)} />
        {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
        <Button type="submit" icon={Droplet} loading={saving} className="w-full">{t("donorPage.log.submit")}</Button>
      </form>
    </Surface>
  );
}

// Other donors sharing this donor's phone number.
function useSamePhone(donor: UserProfile) {
  const [matches, setMatches] = useState<UserProfile[]>([]);
  useEffect(() => {
    if (!donor.phoneNumber) return;
    let cancelled = false;
    getDocs(query(collection(firestore, "users"), where("phoneNumber", "==", donor.phoneNumber)))
      .then(snap => {
        if (!cancelled) setMatches(snap.docs.map(mapUser).filter(user => user.id !== donor.id));
      })
      .catch(error => console.error("Error finding donors with the same phone:", error));
    return () => { cancelled = true; };
  }, [donor.id, donor.phoneNumber]);
  return matches;
}

// On an app account: donors a volunteer added earlier who may be the same person.
function AddedRecordsCard({ donor }: { donor: UserProfile }) {
  const { t, districtName } = useI18n();
  const added = useSamePhone(donor).filter(user => user.hasAccount === false);
  if (!added.length) return null;
  return (
    <Surface className="space-y-2 p-4">
      <h2 className="font-semibold">{t("donorPage.alsoAdded")}</h2>
      <p className="text-sm text-ink-muted">
        {t("donorPage.alsoAddedHint")}
      </p>
      {added.map(user => (
        <Link key={user.id} href={`/donors/${user.id}`} className="block rounded-lg border border-line px-3 py-2 hover:border-ink-faint">
          <span className="font-medium">{user.name}</span>
          <span className="text-sm text-ink-muted"> · {user.bloodType} · {districtName(user.district) || t("common.noDistrict")}</span>
        </Link>
      ))}
    </Surface>
  );
}

// On a donor added without the app: move them onto the account they signed up with.
function MergeCard({ donor, onMerged }: { donor: UserProfile; onMerged: (intoId: string) => void }) {
  const { t } = useI18n();
  const samePhone = useSamePhone(donor).filter(user => user.hasAccount !== false);
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<UserProfile[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy("search");
    try {
      const snap = await getDocs(query(collection(firestore, "users"), where("email", "==", email.trim())));
      setFound(snap.docs.map(mapUser).filter(user => user.hasAccount !== false && user.id !== donor.id));
    } catch (err) {
      console.error("Error searching accounts:", err);
      setError(t("donorPage.couldNotSearch"));
    } finally {
      setBusy(null);
    }
  };

  const merge = async (account: UserProfile) => {
    if (!window.confirm(
      t("donorPage.mergeConfirm", {
        donor: donor.name,
        account: account.name,
        contact: account.email ?? account.phoneNumber ?? "",
      }),
    )) return;
    setError(null);
    setBusy(account.id);
    try {
      await callNotifyApi<MergeDonorResult>(DONOR_ENDPOINTS.merge, { fromId: donor.id, intoId: account.id });
      onMerged(account.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("donorPage.couldNotMerge"));
      setBusy(null);
    }
  };

  const candidates = [...samePhone, ...(found ?? []).filter(user => !samePhone.some(s => s.id === user.id))];

  return (
    <Surface className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">{t("donorPage.signedUp")}</h2>
        <p className="text-sm text-ink-muted">{t("donorPage.mergeHint")}</p>
      </div>
      {candidates.length > 0 && (
        <ul className="space-y-2">
          {candidates.map(account => (
            <li key={account.id} className="rounded-lg border border-line p-3">
              <p className="font-medium">{account.name}</p>
              <p className="text-sm text-ink-muted">
                {[account.bloodType, account.email, account.phoneNumber === donor.phoneNumber && t("donorPage.samePhone")]
                  .filter(Boolean).join(" · ")}
              </p>
              <Button
                variant="secondary"
                icon={Combine}
                loading={busy === account.id}
                disabled={!!busy}
                className="mt-2 w-full"
                onClick={() => merge(account)}
              >
                {t("donorPage.mergeInto")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={search} className="space-y-2">
        <Field
          label={t("donorPage.findByEmail")}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="secondary" icon={Search} loading={busy === "search"} disabled={!!busy} className="w-full">
          {t("common.search")}
        </Button>
        {found && !found.length && <p className="text-sm text-ink-muted">{t("donorPage.noAccount")}</p>}
      </form>
      {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
    </Surface>
  );
}

function AccessCard({ donor, onSave }: {
  donor: UserProfile;
  onSave: (patch: Partial<UserProfile>, success: string) => Promise<void>;
}) {
  const { t, districtName } = useI18n();
  const [role, setRole] = useState<UserRole>(donor.role ?? "donor");
  const [districts, setDistricts] = useState<string[]>(donor.volunteerDistricts ?? []);
  const [saving, setSaving] = useState(false);

  const toggle = (district: string) =>
    setDistricts(prev => (prev.includes(district) ? prev.filter(d => d !== district) : [...prev, district]));

  const save = async () => {
    setSaving(true);
    const success = ROLE_OPTIONS.find(r => r.value === role)!.success;
    await onSave(
      { role, volunteerDistricts: role === "volunteer" ? districts : [] },
      t(success, { name: donor.name }),
    );
    setSaving(false);
  };

  return (
    <Surface className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">{t("donorPage.access")}</h2>
        <p className="text-sm text-ink-muted">{t("donorPage.adminsOnly")}</p>
      </div>
      <Segmented
        options={ROLE_OPTIONS.map(option => ({ value: option.value, label: t(option.label) }))}
        value={role}
        onChange={value => setRole(value as UserRole)}
      />
      {role === "volunteer" && (
        <fieldset>
          <legend className="mb-1.5 text-sm text-ink-muted">
            {t("donorPage.districtsHint")}
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
                  {districtName(district)}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <Button variant="secondary" loading={saving} className="w-full" onClick={save}>{t("donorPage.saveAccess")}</Button>
    </Surface>
  );
}
