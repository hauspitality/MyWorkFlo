import { createClient } from "@/lib/supabase/server";
import { SimulatorClient } from "./simulator-client";

export default async function SimulatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staffRows } = await supabase
    .from("staff")
    .select("business_id")
    .eq("user_id", user?.id ?? "")
    .eq("is_active", true);

  const businessIds = (staffRows ?? []).map((row) => row.business_id);
  const { data: businesses } = businessIds.length
    ? await supabase.from("businesses").select("id, name, control_mode").in("id", businessIds)
    : { data: [] };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink">Dev SMS simulator</h1>
      <p className="mt-1 text-sm text-muted">
        Runs an inbound text through the exact production pipeline — context assembly, tool calls, guardrail
        scan, and control-mode gate — without a real Twilio number. Dev-only.
      </p>
      <SimulatorClient businesses={businesses ?? []} />
    </main>
  );
}
