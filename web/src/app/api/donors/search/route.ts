import { BLOOD_TYPES, COMPATIBLE_DONORS, type BloodType } from "@shared/constants";
import {
  PUBLIC_VISIBILITIES, publicName, type DonorSearchBody, type DonorSearchResult, type PublicDonor,
} from "@shared/donors";
import { getEligibility } from "@shared/eligibility";
import { toDate } from "@shared/format";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, authedRoute } from "@/lib/api";

const MAX_RESULTS = 50;

// Donors who made their profile public, with only the fields they agreed to
// share. User documents stay private to volunteers under the security rules.
export const POST = authedRoute<DonorSearchBody>("any", async (caller, input) => {
  const { bloodType, district, includeCompatible = true } = input;
  if (!BLOOD_TYPES.includes(bloodType as BloodType)) throw new ApiError(400, "Choose a blood group.");

  const groups = includeCompatible ? COMPATIBLE_DONORS[bloodType as BloodType] : [bloodType];
  let donorsQuery = adminDb().collection("users")
    .where("visibility", "in", PUBLIC_VISIBILITIES)
    .where("bloodType", "in", groups);
  if (district) donorsQuery = donorsQuery.where("district", "==", district);
  const snap = await donorsQuery.get();

  const donors = snap.docs
    .filter(doc => {
      const data = doc.data();
      return doc.id !== caller.uid && data.isDonor !== false && data.status !== "inactive";
    })
    .map(doc => {
      const data = doc.data();
      const { eligible, daysRemaining } = getEligibility(toDate(data.lastDonation));
      const donor: PublicDonor = {
        id: doc.id,
        name: publicName(data.name),
        bloodType: data.bloodType,
        district: data.district || undefined,
        area: data.area || undefined,
        verified: data.verified === true,
        eligible,
        daysRemaining,
      };
      if (data.visibility === "public_phone" && data.phoneNumber) donor.phoneNumber = data.phoneNumber;
      return donor;
    })
    // Exact group and donors who can give now first.
    .sort((a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      Number(b.bloodType === bloodType) - Number(a.bloodType === bloodType) ||
      a.daysRemaining - b.daysRemaining,
    )
    .slice(0, MAX_RESULTS);

  return { donors } satisfies DonorSearchResult;
});
