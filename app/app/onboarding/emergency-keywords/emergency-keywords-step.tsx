"use client";

import { useRouter } from "next/navigation";
import { EmergencyKeywordsEditor } from "@/app/_components/settings/emergency-keywords-editor";
import { updateEmergencyKeywords } from "@/lib/business-settings/actions";

export function EmergencyKeywordsStep({ initial, businessName }: { initial: string[]; businessName: string }) {
  const router = useRouter();

  async function handleSave(keywords: string[]) {
    await updateEmergencyKeywords(keywords);
    router.push("/onboarding/control-mode");
  }

  return <EmergencyKeywordsEditor initial={initial} businessName={businessName} onSave={handleSave} submitLabel="Continue" />;
}
