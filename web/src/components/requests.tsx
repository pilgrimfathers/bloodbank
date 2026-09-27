"use client";

import Link from "next/link";
import type { BloodRequest } from "@shared/types";
import { useI18n, type StringKey } from "@/i18n";
import { BloodMark, Pill, type Tone } from "./ui";

export const URGENCY: Record<BloodRequest["urgency"], { label: StringKey; tone: Tone }> = {
  high: { label: "urgency.high", tone: "blood" },
  medium: { label: "urgency.medium", tone: "turmeric" },
  low: { label: "urgency.low", tone: "muted" },
};

export const STATUS: Record<BloodRequest["status"], { label: StringKey; tone: Tone }> = {
  open: { label: "status.open", tone: "info" },
  fulfilled: { label: "status.fulfilled", tone: "leaf" },
  closed: { label: "status.closed", tone: "muted" },
};

// Table of requests; rows link to the request page.
export function RequestTable({ requests }: { requests: BloodRequest[] }) {
  const { t, timeAgo, districtName } = useI18n();
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left">
        <thead className="border-b border-line text-sm text-ink-muted">
          <tr>
            <th className="px-4 py-3 font-medium">{t("requestsList.col.blood")}</th>
            <th className="px-4 py-3 font-medium">{t("requestsList.col.hospital")}</th>
            <th className="px-4 py-3 font-medium">{t("requestsList.col.patient")}</th>
            <th className="px-4 py-3 font-medium">{t("requestsList.col.status")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("requestsList.col.posted")}</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(request => (
            <tr key={request.id} className="border-b border-line last:border-0 hover:bg-paper/60">
              <td className="px-4 py-3">
                <BloodMark bloodType={request.bloodType} size="sm" muted={request.status !== "open"} />
              </td>
              <td className="px-4 py-3">
                <Link href={`/requests/${request.id}`} className="font-semibold hover:text-blood">
                  {request.hospital}
                </Link>
                <p className="text-sm text-ink-muted">
                  {[request.location, districtName(request.district)].filter(Boolean).join(", ")}
                </p>
              </td>
              <td className="px-4 py-3">
                <p>{request.patientName}</p>
                <p className="text-sm text-ink-muted">
                  {request.units === 1 ? t("console.oneUnit") : t("console.units", { count: request.units })}
                </p>
              </td>
              <td className="px-4 py-3">
                {request.status === "open"
                  ? <Pill tone={URGENCY[request.urgency].tone}>{t(URGENCY[request.urgency].label)}</Pill>
                  : <Pill tone={STATUS[request.status].tone}>{t(STATUS[request.status].label)}</Pill>}
              </td>
              <td className="px-4 py-3 text-right text-sm whitespace-nowrap text-ink-muted">
                {request.createdAt ? timeAgo(request.createdAt) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
