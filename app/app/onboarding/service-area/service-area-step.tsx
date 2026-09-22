"use client";

import { useRouter } from "next/navigation";
import { ServiceAreaEditor } from "@/app/_components/settings/service-area-editor";
import { updateServiceArea } from "@/lib/business-settings/actions";
import type { ServiceArea } from "@/lib/supabase/types";

export function ServiceAreaStep({ initial }: { initial: ServiceArea }) {
  const router = useRouter();

  async function handleSave(area: ServiceArea) {
    await updateServiceArea(area);
    router.push("/onboarding/appointment-types");
  }

  return <ServiceAreaEditor initial={initial} onSave={handleSave} submitLabel="Continue" />;
}
