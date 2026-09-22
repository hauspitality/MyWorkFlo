"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentTypesEditor, type AppointmentTypeRow } from "@/app/_components/settings/appointment-types-editor";
import { upsertAppointmentType, deleteAppointmentType } from "@/lib/business-settings/actions";
import { Button } from "@/app/_components/ui";

export function AppointmentTypesStep({ initial }: { initial: AppointmentTypeRow[] }) {
  const router = useRouter();
  const [dirtyCount, setDirtyCount] = useState(0);

  return (
    <div className="space-y-6">
      <AppointmentTypesEditor
        initial={initial}
        onSave={upsertAppointmentType}
        onDelete={deleteAppointmentType}
        onDirtyChange={setDirtyCount}
      />
      <div className="space-y-2">
        {dirtyCount > 0 && (
          <p className="text-center text-xs text-gauge-amber">
            Save your changes above first — Continue won&rsquo;t keep unsaved edits.
          </p>
        )}
        <Button size="lg" disabled={dirtyCount > 0} onClick={() => router.push("/onboarding/emergency-keywords")}>
          Continue
        </Button>
      </div>
    </div>
  );
}
