import { donationSummary, mergedProfileFields, type MergeDonorBody, type MergeDonorResult } from "@shared/donors";
import { toDate } from "@shared/format";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, authedRoute } from "@/lib/api";

// Folds a donor a volunteer added (no app) into the account the same person
// later signed up with: their donation history moves over, the account keeps
// its own details and fills gaps from the added record, which is then deleted.
export const POST = authedRoute<MergeDonorBody>(["admin"], async (caller, { fromId, intoId }) => {
  if (!fromId || !intoId) throw new ApiError(400, "Missing fromId or intoId.");
  if (fromId === intoId) throw new ApiError(400, "Pick a different account to merge into.");
  const db = adminDb();
  const fromRef = db.collection("users").doc(fromId);
  const intoRef = db.collection("users").doc(intoId);

  const [fromSnap, intoSnap, fromDonations, intoDonations] = await Promise.all([
    fromRef.get(),
    intoRef.get(),
    db.collection("donations").where("donorId", "==", fromId).get(),
    db.collection("donations").where("donorId", "==", intoId).get(),
  ]);

  const added = fromSnap.data();
  const account = intoSnap.data();
  if (!added) throw new ApiError(404, "The donor to merge no longer exists.");
  if (!account) throw new ApiError(404, "That account no longer exists.");
  if (added.hasAccount !== false) throw new ApiError(409, "Only donors added without the app can be merged.");
  if (account.hasAccount === false) throw new ApiError(409, "Merge into an app account, not another added donor.");
  if (added.bloodType !== account.bloodType) {
    throw new ApiError(409, `Blood groups differ (${added.bloodType} and ${account.bloodType}). Correct the wrong one first.`);
  }

  const dates = [...fromDonations.docs, ...intoDonations.docs]
    .map(doc => toDate(doc.data().date))
    .filter((date): date is Date => !!date);

  // Firestore batches hold at most 500 writes; donors have far fewer donations.
  const batch = db.batch();
  fromDonations.docs.forEach(doc => batch.update(doc.ref, { donorId: intoId, donorName: account.name }));
  batch.update(intoRef, {
    ...mergedProfileFields(added, account),
    ...donationSummary(dates),
    mergedFrom: [...(account.mergedFrom ?? []), fromId],
    updatedAt: new Date(),
  });
  batch.delete(fromRef);
  await batch.commit();

  console.log(`Donor ${fromId} merged into ${intoId} by ${caller.uid}`);
  return { merged: true, donations: fromDonations.size } satisfies MergeDonorResult;
});
