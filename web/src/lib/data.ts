import {
  collection, doc, getDoc, getDocs, increment, query, where, writeBatch,
  DocumentSnapshot, QueryDocumentSnapshot,
} from "firebase/firestore";
import type { BloodRequest, Donation, UserProfile } from "@shared/types";
import { toDate } from "@shared/format";
import { firestore } from "./firebase";

// Mirrors src/utils/data.ts in the mobile app. Kept per-app because each app
// has its own Firebase SDK instance; the pure helpers live in ../shared.

export function mapUser(snap: DocumentSnapshot | QueryDocumentSnapshot): UserProfile {
  const data = snap.data() ?? {};
  return {
    ...data,
    id: snap.id,
    lastDonation: toDate(data.lastDonation),
    createdAt: toDate(data.createdAt) ?? undefined,
    updatedAt: toDate(data.updatedAt) ?? undefined,
  } as UserProfile;
}

export function mapRequest(snap: DocumentSnapshot | QueryDocumentSnapshot): BloodRequest {
  const data = snap.data() ?? {};
  return { ...data, id: snap.id, createdAt: toDate(data.createdAt)! } as BloodRequest;
}

export function mapDonation(snap: QueryDocumentSnapshot): Donation {
  const data = snap.data();
  return { ...data, id: snap.id, date: toDate(data.date)!, createdAt: toDate(data.createdAt)! } as Donation;
}

export function isVolunteer(user?: UserProfile | null) {
  return user?.role === "volunteer" || user?.role === "admin";
}

// Whether a volunteer can manage donors in the given district.
export function coversDistrict(user: UserProfile | null | undefined, district?: string) {
  if (!isVolunteer(user)) return false;
  if (user!.role === "admin" || !user!.volunteerDistricts?.length) return true;
  return !!district && user!.volunteerDistricts.includes(district);
}

export async function getUser(id: string) {
  const snap = await getDoc(doc(firestore, "users", id));
  return snap.exists() ? mapUser(snap) : null;
}

export async function getDonations(donorId: string): Promise<Donation[]> {
  const snap = await getDocs(query(collection(firestore, "donations"), where("donorId", "==", donorId)));
  return snap.docs.map(mapDonation).sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Records a donation and moves the donor's last donation date forward if needed.
export async function logDonation(
  donor: UserProfile,
  input: { date: Date; hospital?: string; requestId?: string | null },
  recorder: { id: string; name: string },
) {
  const batch = writeBatch(firestore);
  batch.set(doc(collection(firestore, "donations")), {
    donorId: donor.id,
    donorName: donor.name,
    bloodType: donor.bloodType,
    district: donor.district ?? null,
    date: input.date,
    hospital: input.hospital?.trim() || null,
    requestId: input.requestId ?? null,
    recordedBy: recorder.id,
    recordedByName: recorder.name,
    createdAt: new Date(),
  });

  const isLatest = !donor.lastDonation || input.date > donor.lastDonation;
  batch.update(doc(firestore, "users", donor.id), {
    ...(isLatest && { lastDonation: input.date }),
    donationCount: increment(1),
    updatedAt: new Date(),
  });
  await batch.commit();
}

// Deletes a donation and recomputes the donor's last donation from what remains.
export async function deleteDonation(donation: Donation) {
  const remaining = (await getDonations(donation.donorId)).filter(d => d.id !== donation.id);
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, "donations", donation.id));
  batch.update(doc(firestore, "users", donation.donorId), {
    lastDonation: remaining[0]?.date ?? null,
    donationCount: remaining.length,
    updatedAt: new Date(),
  });
  await batch.commit();
}
