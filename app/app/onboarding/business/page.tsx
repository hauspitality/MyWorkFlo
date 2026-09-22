import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { BusinessForm } from "./business-form";

export default async function OnboardingBusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A business already exists → this step is done; continue the wizard
  // instead of re-showing an empty create form.
  const { data: staff } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (staff) redirect("/onboarding/hours");

  return (
    <OnboardingShell step={0} title="Tell us about your business" subtitle="Takes about 2 minutes.">
      <BusinessForm />
    </OnboardingShell>
  );
}
