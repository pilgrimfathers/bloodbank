"use client";

import { useRouter } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";
import type { UserProfile } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { coversDistrict, logDonation } from "@/lib/data";
import { DonorForm, DonorFormError, findDuplicateDonor, type DonorFormValues } from "@/components/donor-form";
import { PageHeader, Surface } from "@/components/ui";

// Volunteers add donors who don't use the app.
export default function NewDonorPage() {
  const router = useRouter();
  const { profile: me } = useAuth();
  if (!me) return null;

  const handleSubmit = async (values: DonorFormValues) => {
    if (!coversDistrict(me, values.district)) {
      throw new DonorFormError(`You don't manage donors in ${values.district}.`);
    }

    const duplicate = await findDuplicateDonor(values);
    if (duplicate && !window.confirm(
      `${duplicate.name ?? "Another donor"} in ${values.district} already uses ${values.phoneNumber}. Save anyway?`,
    )) return;

    const { lastDonation, ...details } = values;
    const newDonor = {
      ...details,
      role: "donor",
      verified: true,
      status: "active",
      hasAccount: false,
      lastDonation: null,
      donationCount: 0,
      createdBy: me.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = await addDoc(collection(firestore, "users"), newDonor);
    if (lastDonation) {
      await logDonation(
        { ...newDonor, id: ref.id } as UserProfile,
        { date: lastDonation, hospital: "Reported when added" },
        { id: me.id, name: me.name },
      );
    }
    router.replace(`/donors/${ref.id}`);
  };

  return (
    <>
      <PageHeader
        back={{ href: "/donors", label: "All donors" }}
        title="Add donor"
        subtitle="For donors who don't use the app. People who sign up themselves appear automatically."
      />
      <Surface className="max-w-3xl p-6">
        <DonorForm
          initial={{ district: me.volunteerDistricts?.[0] ?? me.district }}
          showLastDonation
          showNotes
          submitLabel="Add donor"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </Surface>
    </>
  );
}
