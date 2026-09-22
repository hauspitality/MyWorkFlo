"use client";

import { useRouter } from "next/navigation";
import { EmergencyKeywordsEditor } from "@/app/_components/settings/emergency-keywords-editor";
import { updateEmergencyKeywords } from "@/lib/business-settings/actions";

export function EmergencyKeywordsStep({ initial }: { initial: string[] }) {
  const router = useRouter();

  async function handleSave(keywords: string[]) {
    await updateEmergencyKeywords(keywords);
    router.push("/onboarding/control-mode");
  }

  return <EmergencyKeywordsEditor initial={initial} onSave={handleSave} submitLabel="Continue" />;
}
