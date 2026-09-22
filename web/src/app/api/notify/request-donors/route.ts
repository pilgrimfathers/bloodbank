import type { NotifyResult, RequestDonorsBody } from "@shared/notifications";
import { getEligibility } from "@shared/eligibility";
import { toDate } from "@shared/format";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, authedRoute, logNotification } from "@/lib/api";
import { sendPush, toRecipients } from "@/lib/push";

// Admin-approved alert to donors with the request's blood type.
export const POST = authedRoute<RequestDonorsBody>(["admin"], async (caller, input) => {
  const { requestId, includeCoolingOff = false, districtOnly = false, force = false } = input;
  if (!requestId) throw new ApiError(400, "Missing requestId.");
  const db = adminDb();
  const ref = db.collection("bloodRequests").doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, "That request no longer exists.");
  const request = snap.data()!;
  if (request.status !== "open") throw new ApiError(409, "This request is closed. Reopen it before alerting donors.");
  if (request.donorsNotifiedAt && !force) {
    return { sent: 0, recipients: 0, skipped: "already-notified" } satisfies NotifyResult;
  }

  let donorsQuery = db.collection("users").where("bloodType", "==", request.bloodType);
  if (districtOnly && request.district) donorsQuery = donorsQuery.where("district", "==", request.district);
  const donors = await donorsQuery.get();

  const candidates = donors.docs
    .filter(doc => {
      const data = doc.data();
      if (doc.id === request.requesterId) return false;
      if (data.isDonor === false || data.status === "inactive") return false;
      return includeCoolingOff || getEligibility(toDate(data.lastDonation)).eligible;
    })
    .map(doc => ({ id: doc.id, data: doc.data() }));
  const recipients = toRecipients(candidates);

  const units = `${request.units} ${request.units === 1 ? "unit" : "units"}`;
  const title = `${request.bloodType} blood needed${request.district ? ` in ${request.district}` : ""}`;
  const body = `${units} at ${request.hospital}. Tap to see the request and call the family.`;
  const result = recipients.length
    ? await sendPush(recipients, { title, body, data: { type: "request", requestId } })
    : { sent: 0, recipients: 0 };

  await ref.update({
    donorsNotifiedAt: new Date(),
    donorsNotifiedCount: result.recipients,
    donorsNotifiedByName: caller.name,
  });
  await logNotification({
    type: "request-donors", title, body, requestId, filters: { includeCoolingOff, districtOnly }, ...result, caller,
  });
  return (recipients.length ? result : { ...result, skipped: "no-recipients" }) satisfies NotifyResult;
});
