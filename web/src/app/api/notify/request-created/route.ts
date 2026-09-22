import type { NotifyResult, RequestCreatedBody } from "@shared/notifications";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, authedRoute, logNotification } from "@/lib/api";
import { sendPush, toRecipients } from "@/lib/push";

// Called by the app right after a request is posted. Alerts admins only, once
// per request; donors are alerted later when an admin approves it.
export const POST = authedRoute<RequestCreatedBody>("any", async (caller, { requestId }) => {
  if (!requestId) throw new ApiError(400, "Missing requestId.");
  const db = adminDb();
  const ref = db.collection("bloodRequests").doc(requestId);

  // Claim the notification atomically so retries never alert admins twice.
  const request = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "That request no longer exists.");
    const data = snap.data()!;
    const isStaff = caller.role === "volunteer" || caller.role === "admin";
    if (data.requesterId !== caller.uid && !isStaff) {
      throw new ApiError(403, "You can only announce requests you posted.");
    }
    if (data.adminNotifiedAt) return null;
    tx.update(ref, { adminNotifiedAt: new Date() });
    return data;
  });
  if (!request) return { sent: 0, recipients: 0, skipped: "already-notified" } satisfies NotifyResult;

  const admins = await db.collection("users").where("role", "==", "admin").get();
  const recipients = toRecipients(
    admins.docs.filter(doc => doc.id !== caller.uid).map(doc => ({ id: doc.id, data: doc.data() })),
  );
  if (!recipients.length) return { sent: 0, recipients: 0, skipped: "no-recipients" } satisfies NotifyResult;

  const units = `${request.units} ${request.units === 1 ? "unit" : "units"}`;
  const title = `New ${request.bloodType} request${request.district ? ` in ${request.district}` : ""}`;
  const body = `${units} at ${request.hospital} for ${request.patientName}. Review it and alert donors.`;
  const result = await sendPush(recipients, { title, body, data: { type: "request", requestId } });

  await logNotification({ type: "request-created", title, body, requestId, ...result, caller });
  return result satisfies NotifyResult;
});
