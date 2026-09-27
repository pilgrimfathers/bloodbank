"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { BellRing, Megaphone, ShieldAlert } from "lucide-react";
import { BLOOD_TYPES, KERALA_DISTRICTS } from "@shared/constants";
import { NOTIFY_ENDPOINTS, type BroadcastBody, type NotifyResult } from "@shared/notifications";
import { toDate } from "@shared/format";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { callNotifyApi } from "@/lib/data";
import { Button, EmptyState, Field, PageHeader, Pill, Select, Spinner, Surface, TextArea, type Tone } from "@/components/ui";
import { useI18n, type StringKey } from "@/i18n";

type LogEntry = {
  id: string;
  type: "request-created" | "request-donors" | "broadcast" | "donor-ask";
  title: string;
  body: string;
  requestId?: string;
  recipients: number;
  sentByName?: string;
  createdAt: Date | null;
};

const TYPE_LABELS: Record<LogEntry["type"], { label: StringKey; tone: Tone }> = {
  "request-created": { label: "notify.type.requestCreated", tone: "info" },
  "request-donors": { label: "notify.type.requestDonors", tone: "blood" },
  broadcast: { label: "notify.type.broadcast", tone: "kasavu" },
  "donor-ask": { label: "notify.type.donorAsk", tone: "leaf" },
};

async function fetchLog(): Promise<LogEntry[]> {
  const snap = await getDocs(query(collection(firestore, "notifications"), orderBy("createdAt", "desc"), limit(40)));
  return snap.docs.map(doc => ({ ...(doc.data() as Omit<LogEntry, "id" | "createdAt">), id: doc.id, createdAt: toDate(doc.data().createdAt) }));
}

const EMPTY_FORM = { title: "", body: "", titleMl: "", bodyMl: "", bloodType: "", district: "" };

// Example text for the English title, so it stays in English whatever the console language.
const TITLE_EXAMPLE = "Blood donation camp this Sunday";

export default function NotifyPage() {
  const { profile } = useAuth();
  const { t, formatDate, timeAgo, districtName } = useI18n();
  const [log, setLog] = useState<LogEntry[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const loadLog = useCallback(() => fetchLog().then(setLog, error => {
    console.error("Error loading notification log:", error);
    setLog([]);
  }), []);

  useEffect(() => {
    if (profile?.role === "admin") loadLog();
  }, [profile?.role, loadLog]);

  if (profile?.role !== "admin") {
    return <EmptyState icon={ShieldAlert} title={t("notify.adminsOnly")} />;
  }

  const audienceParams = { bloodType: form.bloodType, district: districtName(form.district) };
  const audience = form.bloodType && form.district
    ? t("notify.audience.both", audienceParams)
    : form.bloodType
      ? t("notify.audience.bloodType", audienceParams)
      : form.district
        ? t("notify.audience.district", audienceParams)
        : t("notify.audience.everyone");
  // The Malayalam version is optional, but needs both a title and a message.
  const hasMalayalam = !!form.titleMl.trim();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (hasMalayalam !== !!form.bodyMl.trim()) {
      setMessage({ tone: "error", text: t("notify.ml.bothOrNeither") });
      return;
    }
    if (!window.confirm(t("notify.confirm", { title: form.title, audience }))) return;
    setSending(true);
    setMessage(null);
    try {
      const result = await callNotifyApi<NotifyResult>(NOTIFY_ENDPOINTS.broadcast, {
        title: form.title,
        body: form.body,
        ...(hasMalayalam && { titleMl: form.titleMl, bodyMl: form.bodyMl }),
        ...(form.bloodType && { bloodType: form.bloodType }),
        ...(form.district && { district: form.district }),
      } satisfies BroadcastBody);
      if (result.skipped === "no-recipients") {
        setMessage({ tone: "error", text: t("notify.nobody") });
      } else {
        setMessage({
          tone: "ok",
          text: result.recipients === 1 ? t("notify.sentOne") : t("notify.sentMany", { count: result.recipients }),
        });
        setForm(EMPTY_FORM);
      }
      loadLog();
    } catch (error) {
      setMessage({ tone: "error", text: (error as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader title={t("notify.title")} subtitle={t("notify.subtitle")} />

      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        <Surface className="h-fit p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Megaphone className="size-5 text-blood" />
              {t("notify.newMessage")}
            </h2>
            <Field
              label={t("notify.titleLabel")}
              required
              maxLength={80}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder={TITLE_EXAMPLE}
            />
            <TextArea
              label={t("notify.messageLabel")}
              required
              maxLength={240}
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              hint={`${form.body.length}/240`}
            />
            <fieldset className="space-y-3 rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-semibold">{t("notify.ml.heading")}</legend>
              <p className="text-sm text-ink-muted">{t("notify.ml.hint")}</p>
              <Field
                label={t("notify.ml.title")}
                lang="ml"
                maxLength={80}
                value={form.titleMl}
                onChange={e => setForm({ ...form, titleMl: e.target.value })}
              />
              <TextArea
                label={t("notify.ml.message")}
                lang="ml"
                maxLength={240}
                value={form.bodyMl}
                onChange={e => setForm({ ...form, bodyMl: e.target.value })}
                hint={`${form.bodyMl.length}/240`}
              />
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t("notify.bloodType")}
                value={form.bloodType}
                onChange={bloodType => setForm({ ...form, bloodType })}
                placeholder={t("notify.everyone")}
                options={BLOOD_TYPES.map(t => ({ value: t, label: t }))}
              />
              <Select
                label={t("console.district")}
                value={form.district}
                onChange={district => setForm({ ...form, district })}
                placeholder={t("console.allKerala")}
                options={KERALA_DISTRICTS.map(d => ({ value: d, label: districtName(d) }))}
              />
            </div>
            <p className="text-sm text-ink-muted">{t("notify.goesTo", { audience })}</p>
            <Button type="submit" icon={BellRing} loading={sending} className="w-full">{t("notify.send")}</Button>
            {message && (
              <p role="status" className={message.tone === "ok" ? "text-sm text-leaf" : "text-sm text-blood"}>
                {message.text}
              </p>
            )}
          </form>
        </Surface>

        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("notify.sentHeading")}</h2>
          {log === null ? (
            <Spinner />
          ) : log.length === 0 ? (
            <EmptyState icon={BellRing} title={t("notify.empty.title")} message={t("notify.empty.message")} />
          ) : (
            <Surface>
              <ul className="divide-y divide-line">
                {log.map(entry => (
                  <li key={entry.id} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pill tone={TYPE_LABELS[entry.type].tone}>{t(TYPE_LABELS[entry.type].label)}</Pill>
                      <span className="text-sm text-ink-muted" title={entry.createdAt ? formatDate(entry.createdAt) : undefined}>
                        {entry.createdAt ? timeAgo(entry.createdAt) : t("time.justNow")}
                      </span>
                    </div>
                    <p className="font-semibold">{entry.title}</p>
                    <p className="text-sm text-ink-muted">{entry.body}</p>
                    <p className="text-sm text-ink-muted">
                      {entry.recipients === 1
                        ? t("notify.recipientOne")
                        : t("notify.recipientMany", { count: entry.recipients })}
                      {entry.sentByName && t("notify.sentBy", { name: entry.sentByName })}
                      {entry.requestId && (
                        <>
                          {", "}
                          <Link href={`/requests/${entry.requestId}`} className="text-blood hover:underline">{t("notify.viewRequest")}</Link>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </Surface>
          )}
        </section>
      </div>
    </>
  );
}
