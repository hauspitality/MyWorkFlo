"use client";

import { useRouter } from "next/navigation";
import { AppointmentTypesEditor, type AppointmentTypeRow } from "@/app/_components/settings/appointment-types-editor";
import { upsertAppointmentType, deleteAppointmentType } from "@/lib/business-settings/actions";

export function AppointmentTypesStep({ initial }: { initial: AppointmentTypeRow[] }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <AppointmentTypesEditor initial={initial} onSave={upsertAppointmentType} onDelete={deleteAppointmentType} />
      <button
        onClick={() => router.push("/onboarding/emergency-keywords")}
        className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep"
      >
        Continue
      </button>
    </div>
  );
}
