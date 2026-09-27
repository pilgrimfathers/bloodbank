"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, FileQuestion, MessageCircle, Phone, UserSearch, XCircle } from "lucide-react";
import type { BloodRequest, Donation } from "@shared/types";
import { auth, firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { coversDistrict, isVolunteer, mapDonation, mapRequest } from "@/lib/data";
import { STATUS, URGENCY } from "@/components/requests";
import { NotifyDonorsPanel } from "@/components/notify-donors";
import { BloodMark, Button, ButtonLink, EmptyState, PageHeader, Pill, Spinner, Surface } from "@/components/ui";
import { useI18n, type StringKey } from "@/i18n";

async function fetchRequest(id: string, withDonations: boolean) {
  const snap = await getDoc(doc(firestore, "bloodRequests", id));
  if (!snap.exists()) return null;
  const donations = withDonations
    ? (await getDocs(query(collection(firestore, "donations"), where("requestId", "==", id)))).docs.map(mapDonation)
    : [];
  return { request: mapRequest(snap), donations };
}

export default function RequestPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, formatDate, timeAgo, districtName } = useI18n();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);
  const [updating, setUpdating] = useState(false);

  const withDonations = isVolunteer(profile);

  // State is only set from the promise callbacks, never synchronously in the effect.
  const load = useCallback(() => fetchRequest(id, withDonations).then(
    result => {
      if (!result) {
        setNotFound(true);
        return;
      }
      setRequest(result.request);
      setDonations(result.donations);
    },
    err => {
      console.error("Error loading request:", err);
      setError("requestPage.couldNotLoad");
    },
  ), [id, withDonations]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (status: "fulfilled" | "closed") => {
    const ok = window.confirm(t(status === "fulfilled" ? "requestPage.confirmFulfilled" : "requestPage.confirmClose"));
    if (!ok) return;

    setUpdating(true);
    setError(null);
    try {
      await updateDoc(doc(firestore, "bloodRequests", id), {
        status,
        updatedAt: new Date(),
        // Donors are credited through donation records, not on the request itself.
        ...(status === "fulfilled" && { fulfilledAt: new Date() }),
      });
      await load();
    } catch (err) {
      console.error("Error updating request:", err);
      setError("requestPage.couldNotUpdate");
    } finally {
      setUpdating(false);
    }
  };

  if (notFound) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={t("requestPage.notFound")}
        action={<ButtonLink href="/requests" variant="secondary">{t("requestPage.backToRequests")}</ButtonLink>}
      />
    );
  }
  if (!request) return error ? <p className="text-blood">{t(error)}</p> : <Spinner />;

  const isOwner = auth.currentUser?.uid === request.requesterId;
  const isManager = coversDistrict(profile, request.district);
  const canUpdate = (isOwner || isManager) && request.status === "open";
  const phone = request.contactNumber?.replace(/\D/g, "").slice(-10);
  const place = [request.location, districtName(request.district)].filter(Boolean).join(", ");
  const findDonors = `/donors?${new URLSearchParams({
    bloodType: request.bloodType,
    district: request.district ?? "",
    requestId: request.id,
  })}`;

  return (
    <>
      <PageHeader
        back={{ href: "/requests", label: t("requestPage.allRequests") }}
        title={request.hospital}
        subtitle={t("requestPage.postedBy", {
          time: timeAgo(request.createdAt),
          name: request.requesterName,
        })}
      />

      {error && <p role="alert" className="mb-4 rounded-lg bg-blood-tint px-3 py-2 text-blood">{t(error)}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Surface className="flex items-center gap-5 p-5">
            <BloodMark bloodType={request.bloodType} size="lg" muted={request.status !== "open"} />
            <div>
              <p className="text-2xl font-bold">
                {request.units === 1
                  ? t("requestPage.oneUnitOf", { bloodType: request.bloodType })
                  : t("requestPage.unitsOf", { units: request.units, bloodType: request.bloodType })}
              </p>
              <p className="text-ink-muted">{t("requestPage.forPatient", { patient: request.patientName })}</p>
              <div className="mt-2 flex gap-2">
                <Pill tone={STATUS[request.status].tone}>{t(STATUS[request.status].label)}</Pill>
                {request.status === "open" && (
                  <Pill tone={URGENCY[request.urgency].tone}>{t(URGENCY[request.urgency].label)}</Pill>
                )}
              </div>
            </div>
          </Surface>

          <Surface>
            <dl className="divide-y divide-line">
              <Detail label={t("requestPage.hospital")} value={request.hospital} />
              <Detail label={t("requestPage.place")} value={place || t("requestPage.notGiven")} />
              <Detail label={t("requestPage.contact")} value={request.contactNumber || t("requestPage.notGiven")} />
              <Detail label={t("requestPage.posted")} value={formatDate(request.createdAt)} />
            </dl>
          </Surface>

          {isManager && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">
                {t("requestPage.donationsLogged", { count: donations.length, units: request.units })}
              </h2>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-leaf"
                  style={{ width: `${Math.min(100, (donations.length / Math.max(1, request.units)) * 100)}%` }}
                />
              </div>
              {donations.length === 0 ? (
                <p className="text-ink-muted">
                  {t("requestPage.noDonations")}
                </p>
              ) : (
                <Surface>
                  <ul className="divide-y divide-line">
                    {donations.map(donation => (
                      <li key={donation.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <Link href={`/donors/${donation.donorId}`} className="font-semibold hover:text-blood">
                          {donation.donorName}
                        </Link>
                        <span className="text-sm text-ink-muted">{formatDate(donation.date)}</span>
                      </li>
                    ))}
                  </ul>
                </Surface>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-3">
          {phone && request.status === "open" && (
            <Surface className="space-y-2 p-4">
              <p className="text-sm font-medium text-ink-muted">{t("requestPage.contactRequester")}</p>
              <a
                href={`tel:${phone}`}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blood font-semibold text-white hover:bg-blood-dark"
              >
                <Phone className="size-4" />
                {t("requestPage.callNumber", { phone: request.contactNumber })}
              </a>
              <a
                href={`https://wa.me/91${phone}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center gap-2 rounded-lg border-[1.5px] border-leaf/40 font-semibold text-leaf hover:bg-leaf-tint"
              >
                <MessageCircle className="size-4" />
                {t("common.whatsapp")}
              </a>
            </Surface>
          )}

          {profile?.role === "admin" && request.status === "open" && (
            <NotifyDonorsPanel request={request} onSent={load} />
          )}

          {isManager && request.status === "open" && (
            <ButtonLink href={findDonors} icon={UserSearch} className="w-full">{t("requestPage.findEligible")}</ButtonLink>
          )}

          {canUpdate && (
            <Surface className="space-y-2 p-4">
              <p className="text-sm font-medium text-ink-muted">{t("requestPage.updateStatus")}</p>
              <Button
                variant="secondary"
                icon={CheckCircle2}
                loading={updating}
                className="w-full text-leaf"
                onClick={() => updateStatus("fulfilled")}
              >
                {t("requestPage.markFulfilled")}
              </Button>
              <Button
                variant="quiet"
                icon={XCircle}
                disabled={updating}
                className="w-full"
                onClick={() => updateStatus("closed")}
              >
                {t("requestPage.closeRequest")}
              </Button>
            </Surface>
          )}
        </aside>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 px-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
