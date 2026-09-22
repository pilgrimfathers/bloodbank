"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { NOTIFY_ENDPOINTS, type NotifyResult, type RequestDonorsBody } from "@shared/notifications";
import type { BloodRequest } from "@shared/types";
import { timeAgo } from "@shared/format";
import { callNotifyApi } from "@/lib/data";
import { Button, Surface } from "./ui";

// Admin control on a request: send the alert to donors with that blood type.
export function NotifyDonorsPanel({ request, onSent }: { request: BloodRequest; onSent: () => void }) {
  const [includeCoolingOff, setIncludeCoolingOff] = useState(false);
  const [districtOnly, setDistrictOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const alreadySent = !!request.donorsNotifiedAt;

  const send = async () => {
    const scope = districtOnly && request.district ? `in ${request.district}` : "across Kerala";
    if (!window.confirm(`Send an alert to donors with ${request.bloodType} blood ${scope}?`)) return;

    setSending(true);
    setMessage(null);
    try {
      const result = await callNotifyApi<NotifyResult>(NOTIFY_ENDPOINTS.requestDonors, {
        requestId: request.id,
        includeCoolingOff,
        districtOnly,
        force: alreadySent,
      } satisfies RequestDonorsBody);
      setMessage(result.skipped === "no-recipients"
        ? { tone: "error", text: `No ${request.bloodType} donors have the app with notifications on yet.` }
        : { tone: "ok", text: `Sent to ${result.recipients} ${result.recipients === 1 ? "donor" : "donors"}.` });
      onSent();
    } catch (error) {
      setMessage({ tone: "error", text: (error as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Surface className="space-y-3 p-4">
      <div>
        <p className="font-semibold">Alert donors</p>
        <p className="text-sm text-ink-muted">
          {alreadySent
            ? `Sent to ${request.donorsNotifiedCount ?? 0} donors ${timeAgo(request.donorsNotifiedAt!)}${request.donorsNotifiedByName ? ` by ${request.donorsNotifiedByName}` : ""}.`
            : `Not sent yet. Donors with ${request.bloodType} blood get a push notification.`}
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--color-blood)]"
          checked={includeCoolingOff}
          onChange={e => setIncludeCoolingOff(e.target.checked)}
        />
        Include donors still in their cool-off
      </label>
      {request.district && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-blood)]"
            checked={districtOnly}
            onChange={e => setDistrictOnly(e.target.checked)}
          />
          Only donors in {request.district}
        </label>
      )}
      <Button icon={BellRing} loading={sending} className="w-full" onClick={send}>
        {alreadySent ? "Send again" : `Notify ${request.bloodType} donors`}
      </Button>
      {message && (
        <p role="status" className={message.tone === "ok" ? "text-sm text-leaf" : "text-sm text-blood"}>
          {message.text}
        </p>
      )}
    </Surface>
  );
}
