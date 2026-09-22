import type { BroadcastBody, NotifyResult } from "@shared/notifications";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, authedRoute, logNotification } from "@/lib/api";
import { sendPush, toRecipients } from "@/lib/push";

// Admin message to everyone with the app, optionally by blood type or district.
export const POST = authedRoute<BroadcastBody>(["admin"], async (caller, body) => {
  const title = body.title?.trim() ?? "";
  const message = body.body?.trim() ?? "";
  if (!title || !message) throw new ApiError(400, "Add a title and a message.");
  if (title.length > 80 || message.length > 240) {
    throw new ApiError(400, "Keep the title under 80 characters and the message under 240.");
  }

  let usersQuery: FirebaseFirestore.Query = adminDb().collection("users");
  if (body.bloodType) usersQuery = usersQuery.where("bloodType", "==", body.bloodType);
  if (body.district) usersQuery = usersQuery.where("district", "==", body.district);
  const users = await usersQuery.get();

  const recipients = toRecipients(
    users.docs.filter(doc => doc.data().status !== "inactive").map(doc => ({ id: doc.id, data: doc.data() })),
  );
  if (!recipients.length) return { sent: 0, recipients: 0, skipped: "no-recipients" } satisfies NotifyResult;

  const result = await sendPush(recipients, { title, body: message, data: { type: "broadcast" } });
  await logNotification({
    type: "broadcast", title, body: message,
    filters: { bloodType: body.bloodType ?? null, district: body.district ?? null }, ...result, caller,
  });
  return result satisfies NotifyResult;
});
