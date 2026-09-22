import { COMPATIBLE_DONORS, type BloodType } from "@shared/constants";
import { DAILY_ASK_LIMIT, PUBLIC_VISIBILITIES, type AskDonorBody, type AskDonorResult } from "@shared/donors";
import { getEligibility } from "@shared/eligibility";
import { toDate } from "@shared/format";
import type { ProfileVisibility } from "@shared/types";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, authedRoute, logNotification } from "@/lib/api";
import { sendPush, toRecipients } from "@/lib/push";

const DAY_MS = 24 * 60 * 60 * 1000;

// Sends one of the caller's open requests to a public donor, whose number may
// be hidden. The donor sees the request and calls the family if they can help.
export const POST = authedRoute<AskDonorBody>("any", async (caller, { donorId, requestId }) => {
  if (!donorId || !requestId) throw new ApiError(400, "Missing donorId or requestId.");
  if (donorId === caller.uid) throw new ApiError(400, "You can't ask yourself.");
  const db = adminDb();

  const [requestSnap, donorSnap, recentAsks] = await Promise.all([
    db.collection("bloodRequests").doc(requestId).get(),
    db.collection("users").doc(donorId).get(),
    db.collection("donorAsks").where("askedBy", "==", caller.uid).get(),
  ]);

  if (!requestSnap.exists) throw new ApiError(404, "That request no longer exists.");
  const request = requestSnap.data()!;
  const isStaff = caller.role === "volunteer" || caller.role === "admin";
  if (request.requesterId !== caller.uid && !isStaff) {
    throw new ApiError(403, "You can only ask donors for requests you posted.");
  }
  if (request.status !== "open") throw new ApiError(409, "This request is closed.");

  const donor = donorSnap.data();
  if (!donor || !PUBLIC_VISIBILITIES.includes(donor.visibility as ProfileVisibility)) {
    throw new ApiError(404, "This donor is no longer listed.");
  }
  if (donor.isDonor === false || donor.status === "inactive") {
    throw new ApiError(409, "This donor is not available right now.");
  }
  if (!COMPATIBLE_DONORS[request.bloodType as BloodType]?.includes(donor.bloodType)) {
    throw new ApiError(409, `${donor.bloodType} can't be given for a ${request.bloodType} request.`);
  }
  const { eligible, daysRemaining } = getEligibility(toDate(donor.lastDonation));
  if (!eligible) throw new ApiError(409, `This donor can give again in ${daysRemaining} days.`);

  const since = Date.now() - DAY_MS;
  const askedToday = recentAsks.docs.filter(doc => (toDate(doc.data().createdAt)?.getTime() ?? 0) > since).length;
  if (!isStaff && askedToday >= DAILY_ASK_LIMIT) {
    throw new ApiError(429, `You can ask up to ${DAILY_ASK_LIMIT} donors a day. Volunteers can help find more.`);
  }

  const recipients = toRecipients([{ id: donorId, data: donor }]);
  if (!recipients.length) return { sent: false, skipped: "no-device" } satisfies AskDonorResult;

  // One ask per donor per request, even if the button is pressed twice.
  const askRef = db.collection("donorAsks").doc(`${requestId}_${donorId}`);
  const claimed = await db.runTransaction(async tx => {
    if ((await tx.get(askRef)).exists) return false;
    tx.set(askRef, { requestId, donorId, askedBy: caller.uid, createdAt: new Date() });
    return true;
  });
  if (!claimed) return { sent: false, skipped: "already-asked" } satisfies AskDonorResult;

  const units = `${request.units} ${request.units === 1 ? "unit" : "units"}`;
  const title = `Can you donate ${donor.bloodType}?`;
  const body = `${caller.name || "Someone"} asked you directly: ${units} of ${request.bloodType} at ${request.hospital}. Tap to see the request and call the family.`;
  const result = await sendPush(recipients, { title, body, data: { type: "request", requestId } });

  await logNotification({ type: "donor-ask", title, body, requestId, filters: { donorId }, ...result, caller });
  return { sent: result.sent > 0 } satisfies AskDonorResult;
});
