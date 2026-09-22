import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TestClient } from "./test-client";

/**
 * "Test your AI" — a product feature, not a dev tool. Runs a pretend
 * customer text through the exact production pipeline (same module the
 * real Twilio webhook calls, in simulation mode) so owners can see
 * precisely how their AI behaves before pointing a real phone number at
 * it. Nothing here texts a real customer, books onto your calendar, or
 * pings your team.
 */
export default async function TestYourAiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRows } = await supabase
    .from("staff")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const businessIds = (staffRows ?? []).map((row) => row.business_id);
  if (!businessIds.length) redirect("/onboarding");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, control_mode")
    .in("id", businessIds);

  if (!businesses?.length) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Test your AI</h1>
      <p className="mt-1 text-sm text-muted">
        Text your AI like a customer would. Nothing here texts a real customer, books onto your calendar, or pings your
        team — it&apos;s a private rehearsal.
      </p>
      <TestClient businesses={businesses} />
    </main>
  );
}
