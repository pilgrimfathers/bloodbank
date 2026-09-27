"use client";

import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { DonorForm, DonorFormError, type DonorFormValues } from "@/components/donor-form";
import { PageHeader, Surface } from "@/components/ui";
import { useI18n } from "@/i18n";

export default function EditMyDetailsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useI18n();
  if (!profile) return null;

  const handleSubmit = async ({ lastDonation: _lastDonation, notes: _notes, ...details }: DonorFormValues) => {
    void _lastDonation;
    void _notes;
    try {
      await updateDoc(doc(firestore, "users", profile.id), { ...details, updatedAt: new Date() });
    } catch (err) {
      console.error("Error updating profile:", err);
      throw new DonorFormError(t("me.couldNotSave"));
    }
    router.push("/me");
  };

  return (
    <>
      <PageHeader back={{ href: "/me", label: t("me.backToPage") }} title={t("myEdit.title")} />
      <Surface className="p-5">
        <DonorForm
          initial={profile}
          submitLabel={t("myEdit.submit")}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/me")}
        />
      </Surface>
    </>
  );
}
