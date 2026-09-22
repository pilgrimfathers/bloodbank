import Link from "next/link";
import type { BloodRequest } from "@shared/types";
import { timeAgo } from "@shared/format";
import { BloodMark, Pill, type Tone } from "./ui";

export const URGENCY: Record<BloodRequest["urgency"], { label: string; tone: Tone }> = {
  high: { label: "Urgent", tone: "blood" },
  medium: { label: "Needed soon", tone: "turmeric" },
  low: { label: "Planned", tone: "muted" },
};

export const STATUS: Record<BloodRequest["status"], { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "info" },
  fulfilled: { label: "Fulfilled", tone: "leaf" },
  closed: { label: "Closed", tone: "muted" },
};

// Table of requests; rows link to the request page.
export function RequestTable({ requests }: { requests: BloodRequest[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left">
        <thead className="border-b border-line text-sm text-ink-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Blood</th>
            <th className="px-4 py-3 font-medium">Hospital</th>
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Posted</th>
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
                  {[request.location, request.district].filter(Boolean).join(", ")}
                </p>
              </td>
              <td className="px-4 py-3">
                <p>{request.patientName}</p>
                <p className="text-sm text-ink-muted">
                  {request.units} {request.units === 1 ? "unit" : "units"}
                </p>
              </td>
              <td className="px-4 py-3">
                {request.status === "open"
                  ? <Pill tone={URGENCY[request.urgency].tone}>{URGENCY[request.urgency].label}</Pill>
                  : <Pill tone={STATUS[request.status].tone}>{STATUS[request.status].label}</Pill>}
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
