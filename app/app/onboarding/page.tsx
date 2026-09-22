import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingRootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staff } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();

  redirect(staff ? "/dashboard" : "/onboarding/business");
}
