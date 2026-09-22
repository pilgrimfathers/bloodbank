"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { BellRing, Check, Droplet, MessageCircle, Phone, SearchX } from "lucide-react";
import { BLOOD_TYPES, COMPATIBLE_DONORS, KERALA_DISTRICTS, type BloodType } from "@shared/constants";
import {
  DAILY_ASK_LIMIT, DONOR_ENDPOINTS,
  type AskDonorBody, type AskDonorResult, type DonorSearchBody, type DonorSearchResult, type PublicDonor,
} from "@shared/donors";
import type { BloodRequest } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { callNotifyApi, mapRequest } from "@/lib/data";
import {
  BloodMark, Button, ButtonLink, EmptyState, PageHeader, Pill, Segmented, Select, Spinner, Surface,
} from "@/components/ui";

const BLOOD_OPTIONS = BLOOD_TYPES.map(type => ({ value: type, label: type }));
const DISTRICT_OPTIONS = KERALA_DISTRICTS.map(district => ({ value: district, label: district }));

export default function FindDonorsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FindDonors />
    </Suspense>
  );
}

// Donors who made their profile public. Asking a donor sends them one of the
// caller's open requests; the donor calls back if they can help.
function FindDonors() {
  const params = useSearchParams();
  const { profile } = useAuth();

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [requestId, setRequestId] = useState(params.get("request") ?? "");
  const [bloodType, setBloodType] = useState(params.get("bloodType") ?? "");
  const [district, setDistrict] = useState(params.get("district") ?? "");
  const [includeCompatible, setIncludeCompatible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const requestParam = useRef(params.get("request"));

  const request = requests.find(r => r.id === requestId) ?? null;

  const selectRequest = useCallback((next: BloodRequest) => {
    setRequestId(next.id);
    setBloodType(next.bloodType);
    setDistrict(next.district ?? "");
  }, []);

  // The caller's own open requests, to ask donors on behalf of.
  useEffect(() => {
    if (!profile?.id) return;
    getDocs(query(
      collection(firestore, "bloodRequests"),
      where("requesterId", "==", profile.id),
      where("status", "==", "open"),
    )).then(snap => {
      const mine = snap.docs.map(mapRequest).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setRequests(mine);
      const passed = mine.find(r => r.id === requestParam.current);
      if (passed) selectRequest(passed);
      else if (!requestParam.current && !params.get("bloodType") && mine[0]) selectRequest(mine[0]);
    }, err => console.error("Error loading your requests:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, selectRequest]);

  // Results are tagged with the search they answer, so a new search shows the
  // spinner until its own results arrive.
  const searchKey = `${bloodType}|${district}|${includeCompatible}`;
  const [results, setResults] = useState<{ key: string; donors: PublicDonor[] } | null>(null);
  const donors = results?.key === searchKey ? results.donors : null;

  useEffect(() => {
    if (!bloodType) return;
    let cancelled = false;
    const key = `${bloodType}|${district}|${includeCompatible}`;
    const body: DonorSearchBody = { bloodType, district: district || undefined, includeCompatible };
    callNotifyApi<DonorSearchResult>(DONOR_ENDPOINTS.search, body).then(
      result => {
        if (cancelled) return;
        setError(null);
        setResults({ key, donors: result.donors });
      },
      err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load donors.");
        setResults({ key, donors: [] });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bloodType, district, includeCompatible]);

  const ask = async (donor: PublicDonor) => {
    if (!request) return;
    const ok = window.confirm(
      `Ask ${donor.name}?\n\nThey'll get a notification about ${request.patientName}'s ${request.bloodType} request at ${request.hospital}, and can call ${request.contactNumber} if they can help.`,
    );
    if (!ok) return;

    setAsking(donor.id);
    setNotice(null);
    setError(null);
    try {
      const body: AskDonorBody = { donorId: donor.id, requestId: request.id };
      const result = await callNotifyApi<AskDonorResult>(DONOR_ENDPOINTS.ask, body);
      if (result.skipped === "no-device") {
        setError(`${donor.name} has notifications turned off. Try another donor or ask a volunteer.`);
        return;
      }
      setAsked(prev => new Set(prev).add(`${request.id}_${donor.id}`));
      setNotice(result.skipped === "already-asked"
        ? `You already sent this request to ${donor.name}.`
        : `Sent to ${donor.name}. Keep your phone close. You can ask up to ${DAILY_ASK_LIMIT} donors a day.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Try again in a minute.");
    } finally {
      setAsking(null);
    }
  };

  const compatible = bloodType ? COMPATIBLE_DONORS[bloodType as BloodType] : [];

  return (
    <>
      <PageHeader
        back={{ href: "/me", label: "My donor page" }}
        title="Find donors"
        subtitle="Donors who chose to be listed publicly."
      />

      <Surface className="space-y-5 p-5">
        {requests.length > 0 ? (
          <Select
            label="Asking for"
            value={requestId}
            onChange={id => {
              const next = requests.find(r => r.id === id);
              if (next) selectRequest(next);
              else setRequestId("");
            }}
            placeholder="Just browsing"
            options={requests.map(r => ({ value: r.id, label: `${r.bloodType} for ${r.patientName} at ${r.hospital}` }))}
          />
        ) : (
          <p className="text-sm text-ink-muted">
            To ask donors whose number is hidden, <Link href="/me/request" className="font-medium text-blood hover:underline">post a request</Link> first.
          </p>
        )}
        <Segmented label="Blood group needed" options={BLOOD_OPTIONS} value={bloodType} onChange={setBloodType} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="District" value={district} onChange={setDistrict} placeholder="All Kerala" options={DISTRICT_OPTIONS} />
          {compatible.length > 1 && (
            <label className="flex items-start gap-3 self-end pb-2">
              <input
                type="checkbox"
                checked={includeCompatible}
                onChange={e => setIncludeCompatible(e.target.checked)}
                className="mt-1 size-4 accent-[var(--color-leaf)]"
              />
              <span>
                <span className="block font-medium">Include compatible donors</span>
                <span className="block text-sm text-ink-muted">{compatible.join(", ")} can give to {bloodType}</span>
              </span>
            </label>
          )}
        </div>
      </Surface>

      <div className="mt-6 space-y-3">
        {notice && <p role="status" className="rounded-lg bg-leaf-tint px-3 py-2 text-sm text-leaf">{notice}</p>}
        {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}

        {!bloodType ? (
          <EmptyState icon={Droplet} title="Choose a blood group" message="Pick the blood group the patient needs." />
        ) : donors === null ? (
          <Spinner label="Finding donors" />
        ) : donors.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No public donors found"
            message="Try all of Kerala. Volunteers can also reach donors who keep their profile private."
            action={!request && <ButtonLink href="/me/request" variant="secondary">Request blood</ButtonLink>}
          />
        ) : (
          <>
            <p className="text-sm text-ink-muted">{donors.length === 1 ? "1 donor" : `${donors.length} donors`}</p>
            <Surface>
              <ul className="divide-y divide-line">
                {donors.map(donor => (
                  <DonorRow
                    key={donor.id}
                    donor={donor}
                    canAsk={!!request}
                    asking={asking === donor.id}
                    asked={!!request && asked.has(`${request.id}_${donor.id}`)}
                    onAsk={() => ask(donor)}
                  />
                ))}
              </ul>
            </Surface>
          </>
        )}
      </div>
    </>
  );
}

function DonorRow({ donor, canAsk, asking, asked, onAsk }: {
  donor: PublicDonor;
  canAsk: boolean;
  asking: boolean;
  asked: boolean;
  onAsk: () => void;
}) {
  const place = [donor.area, donor.district].filter(Boolean).join(", ") || "Kerala";
  const phone = donor.phoneNumber?.replace(/\D/g, "").slice(-10);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3">
      <BloodMark bloodType={donor.bloodType} muted={!donor.eligible} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{donor.name}</p>
        <p className="text-sm text-ink-muted">{place}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {donor.eligible ? <Pill tone="leaf">Can donate</Pill> : <Pill tone="turmeric">{donor.daysRemaining} days left</Pill>}
          {donor.verified && <Pill tone="kasavu">Verified</Pill>}
        </div>
      </div>
      {donor.eligible && (
        <div className="flex gap-2">
          {phone ? (
            <>
              <a
                href={`tel:${phone}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blood px-4 text-[15px] font-semibold text-white hover:bg-blood-dark"
              >
                <Phone className="size-4" />
                {phone}
              </a>
              <a
                href={`https://wa.me/91${phone}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${donor.name}`}
                className="inline-flex h-10 items-center rounded-lg border-[1.5px] border-line bg-surface px-3 text-leaf hover:border-ink-faint"
              >
                <MessageCircle className="size-4" />
              </a>
            </>
          ) : (
            <Button
              variant={asked ? "secondary" : "primary"}
              icon={asked ? Check : BellRing}
              loading={asking}
              disabled={asked || !canAsk}
              title={canAsk ? undefined : "Post a request first"}
              onClick={onAsk}
            >
              {asked ? "Asked" : "Ask to donate"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
