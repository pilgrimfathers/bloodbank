import type { NotifyResult } from "@shared/notifications";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, authedRoute, logNotification } from "@/lib/api";
import { sendPush, toRecipients } from "@/lib/push";
import { userRegisteredMessage } from "@shared/pushMessages";

// Called by the app and website right after someone registers. Alerts admins
// once per account so they can review and verify the new donor.
export const POST = authedRoute<Record<string, never>>("any", async caller => {
  const db = adminDb();
  const ref = db.collection("users").doc(caller.uid);

  // Claim the notification atomically so retries never alert admins twice.
  const user = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "Finish registering first.");
    const data = snap.data()!;
    if (data.adminNotifiedAt) return null;
    tx.update(ref, { adminNotifiedAt: new Date() });
    return data;
  });
  if (!user) return { sent: 0, recipients: 0, skipped: "already-notified" } satisfies NotifyResult;

  const admins = await db.collection("users").where("role", "==", "admin").get();
  const recipients = toRecipients(
    admins.docs.filter(doc => doc.id !== caller.uid).map(doc => ({ id: doc.id, data: doc.data() })),
  );
  if (!recipients.length) return { sent: 0, recipients: 0, skipped: "no-recipients" } satisfies NotifyResult;

  const info = user as Parameters<typeof userRegisteredMessage>[0];
  const { title, body } = userRegisteredMessage(info, "en");
  const result = await sendPush(recipients, language => ({
    ...userRegisteredMessage(info, language),
    data: { type: "donor", donorId: caller.uid },
  }));

  await logNotification({ type: "user-registered", title, body, donorId: caller.uid, ...result, caller });
  return result satisfies NotifyResult;
});
