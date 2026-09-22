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

type StatusFilter = "open" | "all";

export default function RequestsPage() {
  const { profile } = useAuth();
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
        title="Blood requests"
        subtitle={district ? `Requests in ${district}` : "Requests across Kerala"}
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <Select
          label="District"
          className="w-56"
          value={district}
          onChange={setDistrict}
          placeholder="All Kerala"
          options={KERALA_DISTRICTS.map(d => ({ value: d, label: d }))}
        />
        <Segmented
          label="Status"
          value={status}
          onChange={value => setStatus(value as StatusFilter)}
          options={[{ value: "open", label: "Open only" }, { value: "all", label: "Include closed" }]}
        />
      </div>

      {requests === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title={`No ${status === "open" ? "open " : ""}requests${district ? ` in ${district}` : ""}`}
          message="Try another district or include closed requests."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-muted">
            {visible.length} {visible.length === 1 ? "request" : "requests"}
          </p>
          <RequestTable requests={visible} />
        </>
      )}
    </>
  );
}
