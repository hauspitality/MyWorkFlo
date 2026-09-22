"use client";

import { useRouter } from "next/navigation";
import { HoursEditor } from "@/app/_components/settings/hours-editor";
import { updateBusinessHours } from "@/lib/business-settings/actions";
import type { BusinessHours } from "@/lib/supabase/types";

export function HoursStep({ initial }: { initial: BusinessHours }) {
  const router = useRouter();

  async function handleSave(hours: BusinessHours) {
    await updateBusinessHours(hours);
    router.push("/onboarding/service-area");
  }

  return <HoursEditor initial={initial} onSave={handleSave} submitLabel="Continue" />;
}
