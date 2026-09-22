import type { QuerySnapshot } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { authedRoute } from "@/lib/api";

// Permanently deletes the caller's account and everything tied to it:
// donation history, blood requests they posted, their profile (including
// push tokens) and their login. Required by Google Play.
export const POST = authedRoute<Record<string, never>>("any", async caller => {
  const db = adminDb();
  const [donations, requests] = await Promise.all([
    db.collection("donations").where("donorId", "==", caller.uid).get(),
    db.collection("bloodRequests").where("requesterId", "==", caller.uid).get(),
  ]);

  await deleteAll([donations, requests]);
  await db.collection("users").doc(caller.uid).delete();
  await adminAuth().deleteUser(caller.uid);

  return { deleted: true, donations: donations.size, requests: requests.size };
});

// Firestore batches hold at most 500 writes.
async function deleteAll(snapshots: QuerySnapshot[]) {
  const refs = snapshots.flatMap(snapshot => snapshot.docs.map(doc => doc.ref));
  for (let i = 0; i < refs.length; i += 450) {
    const batch = adminDb().batch();
    refs.slice(i, i + 450).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}
