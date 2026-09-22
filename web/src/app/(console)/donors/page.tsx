"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, query, where, type QueryConstraint } from "firebase/firestore";
import { Info, Search, UserPlus, Users, X } from "lucide-react";
import { BLOOD_TYPES, COMPATIBLE_DONORS, KERALA_DISTRICTS, type BloodType } from "@shared/constants";
import { getEligibility } from "@shared/eligibility";
import type { UserProfile } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { isVolunteer, mapUser } from "@/lib/data";
import { EligibilityPill } from "@/components/eligibility";
import { BloodMark, ButtonLink, EmptyState, PageHeader, Pill, Segmented, Select, Spinner } from "@/components/ui";

type EligibilityFilter = "all" | "eligible" | "cooling";

const ELIGIBILITY_OPTIONS: { value: EligibilityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "eligible", label: "Can donate" },
  { value: "cooling", label: "Cooling off" },
];

const BLOOD_OPTIONS = BLOOD_TYPES.map(type => ({ value: type, label: type }));

export default function DonorsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <DonorRegistryForRequest />
    </Suspense>
  );
}

// Remount when switching requests so the filters start from that request.
function DonorRegistryForRequest() {
  const requestId = useSearchParams().get("requestId") ?? "";
  return <DonorRegistry key={requestId} />;
}

function DonorRegistry() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const requestId = params.get("requestId") ?? "";
  const paramBloodType = params.get("bloodType") ?? "";
  const paramDistrict = params.get("district") ?? "";

  // Volunteers limited to some districts must always query one of them.
  const allowedDistricts = profile?.role !== "admin" && profile?.volunteerDistricts?.length
    ? profile.volunteerDistricts
    : null;
  const defaultDistrict = paramDistrict && (!allowedDistricts || allowedDistricts.includes(paramDistrict))
    ? paramDistrict
    : allowedDistricts?.[0] ?? "";

  const [district, setDistrict] = useState(defaultDistrict);
  const [bloodType, setBloodType] = useState(paramBloodType);
  const [includeCompatible, setIncludeCompatible] = useState(!!requestId);
  const [eligibility, setEligibility] = useState<EligibilityFilter>(requestId ? "eligible" : "all");
  const [search, setSearch] = useState("");
  // District-limited volunteers always query one of their own districts.
  const effectiveDistrict = !allowedDistricts || allowedDistricts.includes(district) ? district : allowedDistricts[0];

  // Results are tagged with the query they answer, so "loading" is derived
  // instead of being reset inside the effect.
  const queryKey = JSON.stringify([effectiveDistrict, bloodType, includeCompatible]);
  const [result, setResult] = useState<{ key: string; donors: UserProfile[]; error: string | null } | null>(null);
  const loading = result?.key !== queryKey;
  const donors = useMemo(() => (loading ? [] : result!.donors), [loading, result]);
  const error = loading ? null : result!.error;

  useEffect(() => {
    if (!isVolunteer(profile)) return;
    let cancelled = false;
    const district = effectiveDistrict;

    const constraints: QueryConstraint[] = [];
    if (district) constraints.push(where("district", "==", district));
    if (bloodType) {
      constraints.push(includeCompatible
        ? where("bloodType", "in", COMPATIBLE_DONORS[bloodType as BloodType])
        : where("bloodType", "==", bloodType));
    }

    getDocs(query(collection(firestore, "users"), ...constraints))
      .then(snap => {
        if (!cancelled) setResult({ key: queryKey, donors: snap.docs.map(mapUser), error: null });
      })
      .catch(err => {
        console.error("Error fetching donors:", err);
        if (!cancelled) {
          setResult({ key: queryKey, donors: [], error: "Could not load donors. Check your connection and try again." });
        }
      });

    return () => { cancelled = true; };
  }, [profile, queryKey, effectiveDistrict, bloodType, includeCompatible]);

  const visibleDonors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return donors
      .map(donor => ({ donor, eligible: getEligibility(donor.lastDonation).eligible }))
      .filter(({ donor, eligible }) => {
        if (eligibility === "eligible" && (!eligible || !donor.isDonor || donor.status === "inactive")) return false;
        if (eligibility === "cooling" && eligible) return false;
        if (!term) return true;
        return donor.name?.toLowerCase().includes(term)
          || donor.phoneNumber?.includes(term)
          || donor.area?.toLowerCase().includes(term);
      })
      // Donors who can give right now first, then alphabetical.
      .sort((a, b) => Number(b.eligible) - Number(a.eligible) || (a.donor.name ?? "").localeCompare(b.donor.name ?? ""))
      .map(({ donor }) => donor);
  }, [donors, search, eligibility]);

  const districtOptions = [
    ...(allowedDistricts ? [] : [{ value: "", label: "All Kerala" }]),
    ...(allowedDistricts ?? KERALA_DISTRICTS).map(d => ({ value: d, label: d })),
  ];

  const donorHref = (id: string) => (requestId ? `/donors/${id}?requestId=${requestId}` : `/donors/${id}`);

  return (
    <>
      <PageHeader
        title="Donors"
        subtitle={allowedDistricts ? `Managing ${allowedDistricts.join(", ")}` : "Managing all of Kerala"}
        actions={<ButtonLink href="/donors/new" icon={UserPlus}>Add donor</ButtonLink>}
      />

      {requestId && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-info-tint px-4 py-3 text-info">
          <Info className="mt-0.5 size-5 shrink-0" />
          <p className="flex-1">
            Finding donors for a {paramBloodType} request. Open a donor to log their donation against it.
          </p>
          <button
            onClick={() => router.replace("/donors")}
            aria-label="Stop finding donors for this request"
            className="rounded p-0.5 hover:bg-info/10"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="mb-4 grid gap-4 rounded-xl border border-line bg-surface p-4 md:grid-cols-[1fr_1fr_2fr]">
        <Select label="District" options={districtOptions} value={effectiveDistrict} onChange={setDistrict} />
        <Select
          label="Blood type"
          options={BLOOD_OPTIONS}
          value={bloodType}
          onChange={setBloodType}
          placeholder="Any"
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-muted">Search</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, phone or area"
              className="h-11 w-full rounded-lg border-[1.5px] border-line bg-surface pr-3 pl-9 text-[15px] placeholder:text-ink-faint focus:border-blood focus:outline-none"
            />
          </span>
        </label>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 md:col-span-3">
          <Segmented
            label="Eligibility"
            options={ELIGIBILITY_OPTIONS}
            value={eligibility}
            onChange={value => setEligibility(value as EligibilityFilter)}
          />
          {bloodType && (
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCompatible}
                onChange={e => setIncludeCompatible(e.target.checked)}
                className="size-4 accent-[var(--color-leaf)]"
              />
              Include compatible donors ({COMPATIBLE_DONORS[bloodType as BloodType].join(", ")})
            </label>
          )}
        </div>
      </div>

      {!loading && !error && (
        <p className="mb-3 text-sm text-ink-muted">
          Showing {visibleDonors.length} of {donors.length} {donors.length === 1 ? "donor" : "donors"}
        </p>
      )}

      {loading ? (
        <Spinner label="Loading donors" />
      ) : error ? (
        <p role="alert" className="rounded-lg bg-blood-tint px-4 py-3 text-blood">{error}</p>
      ) : visibleDonors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No donors match these filters"
          message="Try another district or blood type, or add a donor who doesn't use the app."
          action={<ButtonLink href="/donors/new" variant="secondary" icon={UserPlus}>Add donor</ButtonLink>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-line text-sm text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Blood</th>
                <th className="px-4 py-3 font-medium">Donor</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Eligibility</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleDonors.map(donor => {
                const eligible = getEligibility(donor.lastDonation).eligible;
                const active = eligible && donor.isDonor && donor.status !== "inactive";
                const place = [donor.area, donor.district].filter(Boolean).join(", ") || "No district set";
                return (
                  <tr key={donor.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <BloodMark bloodType={donor.bloodType} size="sm" muted={!active} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={donorHref(donor.id)} className="font-semibold hover:text-blood">
                        {donor.name}
                      </Link>
                      <p className="text-sm text-ink-muted">{place}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {donor.phoneNumber
                        ? <a href={`tel:${donor.phoneNumber}`} className="hover:text-blood">{donor.phoneNumber}</a>
                        : <span className="text-ink-faint">No phone number</span>}
                    </td>
                    <td className="px-4 py-3">
                      <EligibilityPill lastDonation={donor.lastDonation} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {donor.role === "volunteer" && <Pill tone="info">Volunteer</Pill>}
                        {donor.role === "admin" && <Pill tone="info">Admin</Pill>}
                        {!donor.verified && <Pill tone="muted">Unverified</Pill>}
                        {!donor.isDonor && <Pill tone="turmeric">Unavailable</Pill>}
                        {donor.status === "inactive" && <Pill tone="muted">Inactive</Pill>}
                        {donor.hasAccount === false && <Pill tone="kasavu">No app</Pill>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
