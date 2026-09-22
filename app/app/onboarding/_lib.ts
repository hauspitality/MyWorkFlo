import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Every onboarding step past "business" needs a business to already exist. */
export async function resolveOnboardingBusinessId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staff) redirect("/onboarding/business");

  return staff.business_id;
}
