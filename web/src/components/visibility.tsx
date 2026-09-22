"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { LoaderCircle } from "lucide-react";
import { VISIBILITY_OPTIONS } from "@shared/donors";
import type { ProfileVisibility, UserProfile } from "@shared/types";
import { firestore } from "@/lib/firebase";
import { Surface, cx } from "./ui";

// Lets donors choose who outside the volunteer team can find them. Saves on
// click; the live profile in useAuth picks up the change.
export function VisibilityPicker({ profile }: { profile: UserProfile }) {
  const [saving, setSaving] = useState<ProfileVisibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = profile.visibility ?? "private";

  const choose = async (visibility: ProfileVisibility) => {
    if (visibility === current || saving) return;
    setSaving(visibility);
    setError(null);
    try {
      await updateDoc(doc(firestore, "users", profile.id), { visibility, updatedAt: new Date() });
    } catch (err) {
      console.error("Error saving visibility:", err);
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3">
      <Surface>
        <div role="radiogroup" aria-label="Who can find you" className="divide-y divide-line">
          {VISIBILITY_OPTIONS.map(option => {
            const selected = option.value === current;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!!saving}
                onClick={() => choose(option.value)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted-tint disabled:cursor-wait"
              >
                {saving === option.value ? (
                  <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-blood" />
                ) : (
                  <span
                    className={cx(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-blood" : "border-ink-faint",
                    )}
                  >
                    {selected && <span className="size-2.5 rounded-full bg-blood" />}
                  </span>
                )}
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-sm text-ink-muted">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Surface>
      {error && <p role="alert" className="rounded-lg bg-blood-tint px-3 py-2 text-sm text-blood">{error}</p>}
    </div>
  );
}
