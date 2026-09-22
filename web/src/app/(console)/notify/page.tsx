"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { BellRing, Megaphone, ShieldAlert } from "lucide-react";
import { BLOOD_TYPES, KERALA_DISTRICTS } from "@shared/constants";
import { NOTIFY_ENDPOINTS, type BroadcastBody, type NotifyResult } from "@shared/notifications";
import { formatDate, timeAgo, toDate } from "@shared/format";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { callNotifyApi } from "@/lib/data";
import { Button, EmptyState, Field, PageHeader, Pill, Select, Spinner, Surface, TextArea, type Tone } from "@/components/ui";

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

const TYPE_LABELS: Record<LogEntry["type"], { label: string; tone: Tone }> = {
  "request-created": { label: "New request to admins", tone: "info" },
  "request-donors": { label: "Request to donors", tone: "blood" },
  broadcast: { label: "Broadcast", tone: "kasavu" },
  "donor-ask": { label: "Asked a donor", tone: "leaf" },
};

async function fetchLog(): Promise<LogEntry[]> {
  const snap = await getDocs(query(collection(firestore, "notifications"), orderBy("createdAt", "desc"), limit(40)));
  return snap.docs.map(doc => ({ ...(doc.data() as Omit<LogEntry, "id" | "createdAt">), id: doc.id, createdAt: toDate(doc.data().createdAt) }));
}

export default function NotifyPage() {
  const { profile } = useAuth();
  const [log, setLog] = useState<LogEntry[] | null>(null);
  const [form, setForm] = useState({ title: "", body: "", bloodType: "", district: "" });
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
    return <EmptyState icon={ShieldAlert} title="Only admins can send notifications" />;
  }

  const audience = [form.bloodType && `${form.bloodType} donors`, form.district && `in ${form.district}`]
    .filter(Boolean).join(" ") || "everyone with the app";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!window.confirm(`Send "${form.title}" to ${audience}?`)) return;
    setSending(true);
    setMessage(null);
    try {
      const result = await callNotifyApi<NotifyResult>(NOTIFY_ENDPOINTS.broadcast, {
        title: form.title,
        body: form.body,
        ...(form.bloodType && { bloodType: form.bloodType }),
        ...(form.district && { district: form.district }),
      } satisfies BroadcastBody);
      if (result.skipped === "no-recipients") {
        setMessage({ tone: "error", text: `Nobody in ${audience} has notifications on yet.` });
      } else {
        setMessage({ tone: "ok", text: `Sent to ${result.recipients} ${result.recipients === 1 ? "person" : "people"}.` });
        setForm({ title: "", body: "", bloodType: "", district: "" });
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
      <PageHeader title="Notify" subtitle="Send a message to people who use the app, and see everything sent so far." />

      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        <Surface className="h-fit p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Megaphone className="size-5 text-blood" />
              New message
            </h2>
            <Field
              label="Title"
              required
              maxLength={80}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Blood donation camp this Sunday"
            />
            <TextArea
              label="Message"
              required
              maxLength={240}
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              hint={`${form.body.length}/240`}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Blood type"
                value={form.bloodType}
                onChange={bloodType => setForm({ ...form, bloodType })}
                placeholder="Everyone"
                options={BLOOD_TYPES.map(t => ({ value: t, label: t }))}
              />
              <Select
                label="District"
                value={form.district}
                onChange={district => setForm({ ...form, district })}
                placeholder="All Kerala"
                options={KERALA_DISTRICTS.map(d => ({ value: d, label: d }))}
              />
            </div>
            <p className="text-sm text-ink-muted">Goes to {audience}.</p>
            <Button type="submit" icon={BellRing} loading={sending} className="w-full">Send notification</Button>
            {message && (
              <p role="status" className={message.tone === "ok" ? "text-sm text-leaf" : "text-sm text-blood"}>
                {message.text}
              </p>
            )}
          </form>
        </Surface>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Sent</h2>
          {log === null ? (
            <Spinner />
          ) : log.length === 0 ? (
            <EmptyState icon={BellRing} title="Nothing sent yet" message="Request alerts and broadcasts show up here." />
          ) : (
            <Surface>
              <ul className="divide-y divide-line">
                {log.map(entry => (
                  <li key={entry.id} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pill tone={TYPE_LABELS[entry.type].tone}>{TYPE_LABELS[entry.type].label}</Pill>
                      <span className="text-sm text-ink-muted" title={entry.createdAt ? formatDate(entry.createdAt) : undefined}>
                        {entry.createdAt ? timeAgo(entry.createdAt) : "just now"}
                      </span>
                    </div>
                    <p className="font-semibold">{entry.title}</p>
                    <p className="text-sm text-ink-muted">{entry.body}</p>
                    <p className="text-sm text-ink-muted">
                      {entry.recipients} {entry.recipients === 1 ? "recipient" : "recipients"}
                      {entry.sentByName && `, sent by ${entry.sentByName}`}
                      {entry.requestId && (
                        <>
                          {", "}
                          <Link href={`/requests/${entry.requestId}`} className="text-blood hover:underline">view request</Link>
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
