import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { ANDROID_CHANNEL_ID, type NotificationData } from "@shared/notifications";
import { adminDb } from "./firebase-admin";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

export type Recipient = { uid: string; tokens: string[] };

export type PushMessage = {
  title: string;
  body: string;
  data: NotificationData;
};

type ExpoTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

function isExpoToken(token: unknown): token is string {
  return typeof token === "string" && /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

// Turns user documents into recipients with valid, de-duplicated tokens.
export function toRecipients(users: { id: string; data: FirebaseFirestore.DocumentData }[]): Recipient[] {
  return users
    .map(({ id, data }) => ({ uid: id, tokens: [...new Set((data.pushTokens ?? []).filter(isExpoToken))] as string[] }))
    .filter(recipient => recipient.tokens.length > 0);
}

// Sends one message to every device of every recipient through Expo's push
// service, and drops tokens Expo reports as no longer registered.
export async function sendPush(recipients: Recipient[], message: PushMessage) {
  const targets = recipients.flatMap(({ uid, tokens }) => tokens.map(token => ({ uid, token })));
  const deadTokens: { uid: string; token: string }[] = [];
  let sent = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN && { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }),
      },
      body: JSON.stringify(batch.map(({ token }) => ({
        to: token,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: "default",
        priority: "high",
        channelId: ANDROID_CHANNEL_ID,
      }))),
    });

    if (!response.ok) {
      console.error("Expo push request failed:", response.status, await response.text());
      continue;
    }

    const { data: tickets } = (await response.json()) as { data: ExpoTicket[] };
    tickets.forEach((ticket, index) => {
      if (ticket.status === "ok") {
        sent++;
      } else if (ticket.details?.error === "DeviceNotRegistered") {
        deadTokens.push(batch[index]);
      } else {
        console.warn("Expo push ticket error:", ticket.message);
      }
    });
  }

  await Promise.all(deadTokens.map(({ uid, token }) =>
    adminDb().collection("users").doc(uid).update({ pushTokens: FieldValue.arrayRemove(token) }).catch(() => {}),
  ));

  return { sent, recipients: recipients.length };
}
