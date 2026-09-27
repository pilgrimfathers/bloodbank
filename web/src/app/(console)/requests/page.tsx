"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { HandHeart } from "lucide-react";
import { KERALA_DISTRICTS } from "@shared/constants";
import type { BloodRequest } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { mapRequest } from "@/lib/data";
import { RequestTable } from "@/components/requests";
import { EmptyState, PageHeader, Segmented, Select, Spinner } from "@/components/ui";
import { useI18n } from "@/i18n";

type StatusFilter = "open" | "all";

export default function RequestsPage() {
  const { profile } = useAuth();
  const { t, districtName } = useI18n();
  const [requests, setRequests] = useState<BloodRequest[] | null>(null);
  const [district, setDistrict] = useState(profile?.district ?? "");
  const [status, setStatus] = useState<StatusFilter>("open");

  useEffect(() => {
    getDocs(query(collection(firestore, "bloodRequests"), orderBy("createdAt", "desc"), limit(300)))
      .then(snap => setRequests(snap.docs.map(mapRequest)))
      .catch(error => {
        console.error("Error loading requests:", error);
        setRequests([]);
      });
  }, []);

  // Filtered client-side to avoid needing a district+createdAt composite index.
  const visible = useMemo(
    () => (requests ?? []).filter(r =>
      (!district || r.district === district) && (status === "all" || r.status === "open")),
    [requests, district, status],
  );

  return (
    <>
      <PageHeader
        title={t("requestsList.title")}
        subtitle={district
          ? t("requestsList.subtitleDistrict", { district: districtName(district) })
          : t("requestsList.subtitleAll")}
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <Select
          label={t("console.district")}
          className="w-56"
          value={district}
          onChange={setDistrict}
          placeholder={t("console.allKerala")}
          options={KERALA_DISTRICTS.map(d => ({ value: d, label: districtName(d) }))}
        />
        <Segmented
          label={t("requestsList.status")}
          value={status}
          onChange={value => setStatus(value as StatusFilter)}
          options={[
            { value: "open", label: t("requestsList.openOnly") },
            { value: "all", label: t("requestsList.includeClosed") },
          ]}
        />
      </div>

      {requests === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title={district
            ? t(status === "open" ? "requestsList.empty.openInDistrict" : "requestsList.empty.anyInDistrict", {
              district: districtName(district),
            })
            : t(status === "open" ? "requestsList.empty.open" : "requestsList.empty.any")}
          message={t("requestsList.empty.message")}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-muted">
            {visible.length === 1
              ? t("requestsList.countOne")
              : t("requestsList.countMany", { count: visible.length })}
          </p>
          <RequestTable requests={visible} />
        </>
      )}
    </>
  );
}
