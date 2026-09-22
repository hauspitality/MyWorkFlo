"use client";

import { useRouter } from "next/navigation";
import { ControlModeSelector } from "@/app/_components/settings/control-mode-selector";
import { updateControlMode } from "@/lib/business-settings/actions";
import type { ControlMode } from "@/lib/supabase/types";

export function ControlModeStep({ initial, approvalExpiryMinutes }: { initial: ControlMode; approvalExpiryMinutes: number }) {
  const router = useRouter();

  async function handleSave(mode: ControlMode) {
    await updateControlMode(mode);
    router.push("/onboarding/calendar");
  }

  return (
    <ControlModeSelector
      initial={initial}
      onSave={handleSave}
      submitLabel="Continue"
      approvalExpiryMinutes={approvalExpiryMinutes}
    />
  );
}
