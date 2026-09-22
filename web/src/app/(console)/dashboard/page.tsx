"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { HandHeart, UserPlus, Users } from "lucide-react";
import type { BloodRequest } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { mapRequest } from "@/lib/data";
import { RequestTable } from "@/components/requests";
import { ButtonLink, EmptyState, PageHeader, Spinner } from "@/components/ui";

export default function OverviewPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[] | null>(null);
  const [counts, setCounts] = useState<{ open: number; urgent: number } | null>(null);

  useEffect(() => {
    const open = query(collection(firestore, "bloodRequests"), where("status", "==", "open"));
    Promise.all([
      getDocs(query(open, orderBy("createdAt", "desc"), limit(10))),
      getCountFromServer(open),
      getCountFromServer(query(open, where("urgency", "==", "high"))),
    ])
      .then(([recent, openCount, urgentCount]) => {
        setRequests(recent.docs.map(mapRequest));
        setCounts({ open: openCount.data().count, urgent: urgentCount.data().count });
      })
      .catch(error => {
        console.error("Error loading overview:", error);
        setRequests([]);
      });
  }, []);

  const firstName = profile?.name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Good to see you, ${firstName}` : "Overview"}
        subtitle="Open blood requests waiting for donors."
        actions={
          <>
            <ButtonLink href="/donors/new" variant="secondary" icon={UserPlus}>Add donor</ButtonLink>
            <ButtonLink href="/donors" icon={Users}>Find donors</ButtonLink>
          </>
        }
      />

      {counts && (
        <p className="mb-6 text-lg text-ink-muted">
          <span className="font-semibold text-ink">{counts.open}</span> open {counts.open === 1 ? "request" : "requests"}
          {counts.urgent > 0 && (
            <>, <span className="font-semibold text-blood">{counts.urgent} urgent</span></>
          )}
        </p>
      )}

      {requests === null ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="No open requests right now"
          message="New requests from the app show up here."
        />
      ) : (
        <>
          <RequestTable requests={requests} />
          <Link href="/requests" className="mt-4 inline-block font-medium text-blood hover:underline">
            See all requests
          </Link>
        </>
      )}
    </>
  );
}
