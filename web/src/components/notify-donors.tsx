"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { NOTIFY_ENDPOINTS, type NotifyResult, type RequestDonorsBody } from "@shared/notifications";
import type { BloodRequest } from "@shared/types";
import { callNotifyApi } from "@/lib/data";
import { useI18n } from "@/i18n";
import { Button, Surface } from "./ui";

// Admin control on a request: send the alert to donors with that blood type.
export function NotifyDonorsPanel({ request, onSent }: { request: BloodRequest; onSent: () => void }) {
  const { t, timeAgo, districtName } = useI18n();
  const [includeCoolingOff, setIncludeCoolingOff] = useState(false);
  const [districtOnly, setDistrictOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const alreadySent = !!request.donorsNotifiedAt;

  const send = async () => {
    const confirmText = districtOnly && request.district
      ? t("notifyDonors.confirmDistrict", { bloodType: request.bloodType, district: districtName(request.district) })
      : t("notifyDonors.confirmKerala", { bloodType: request.bloodType });
    if (!window.confirm(confirmText)) return;

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
        ? { tone: "error", text: t("notifyDonors.nobody", { bloodType: request.bloodType }) }
        : {
          tone: "ok",
          text: result.recipients === 1
            ? t("notifyDonors.sentOne")
            : t("notifyDonors.sentMany", { count: result.recipients }),
        });
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
        <p className="font-semibold">{t("notifyDonors.title")}</p>
        <p className="text-sm text-ink-muted">
          {alreadySent
            ? t(request.donorsNotifiedByName ? "notifyDonors.summaryBy" : "notifyDonors.summary", {
              count: request.donorsNotifiedCount ?? 0,
              time: timeAgo(request.donorsNotifiedAt!),
              name: request.donorsNotifiedByName ?? "",
            })
            : t("notifyDonors.notSent", { bloodType: request.bloodType })}
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--color-blood)]"
          checked={includeCoolingOff}
          onChange={e => setIncludeCoolingOff(e.target.checked)}
        />
        {t("notifyDonors.includeCoolingOff")}
      </label>
      {request.district && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-blood)]"
            checked={districtOnly}
            onChange={e => setDistrictOnly(e.target.checked)}
          />
          {t("notifyDonors.districtOnly", { district: districtName(request.district) })}
        </label>
      )}
      <Button icon={BellRing} loading={sending} className="w-full" onClick={send}>
        {alreadySent ? t("notifyDonors.sendAgain") : t("notifyDonors.button", { bloodType: request.bloodType })}
      </Button>
      {message && (
        <p role="status" className={message.tone === "ok" ? "text-sm text-leaf" : "text-sm text-blood"}>
          {message.text}
        </p>
      )}
    </Surface>
  );
}
