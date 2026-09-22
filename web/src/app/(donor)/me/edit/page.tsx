"use client";

import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { DonorForm, DonorFormError, type DonorFormValues } from "@/components/donor-form";
import { PageHeader, Surface } from "@/components/ui";

export default function EditMyDetailsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  if (!profile) return null;

  const handleSubmit = async ({ lastDonation: _lastDonation, notes: _notes, ...details }: DonorFormValues) => {
    void _lastDonation;
    void _notes;
    try {
      await updateDoc(doc(firestore, "users", profile.id), { ...details, updatedAt: new Date() });
    } catch (err) {
      console.error("Error updating profile:", err);
      throw new DonorFormError("Could not save. Check your connection and try again.");
    }
    router.push("/me");
  };

  return (
    <>
      <PageHeader back={{ href: "/me", label: "My donor page" }} title="Edit details" />
      <Surface className="p-5">
        <DonorForm
          initial={profile}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onCancel={() => router.push("/me")}
        />
      </Surface>
    </>
  );
}
