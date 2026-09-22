import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InstallPrompt } from "./install-prompt";
import { PushDemo } from "./push-demo";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");

  const { data: business } = await supabase.from("businesses").select("name, control_mode").eq("id", staffRow.business_id).single();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink">{business?.name}</h1>
      <p className="mt-1 text-sm text-muted">Control mode: {business?.control_mode}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/settings" className="rounded-lg border border-line bg-card p-4 hover:border-accent-blue">
          <h2 className="text-sm font-semibold text-ink">Settings</h2>
          <p className="mt-1 text-xs text-muted">Hours, service area, appointment types, control mode.</p>
        </Link>
        <Link href="/dashboard/dev/simulate" className="rounded-lg border border-line bg-card p-4 hover:border-accent-blue">
          <h2 className="text-sm font-semibold text-ink">Dev SMS simulator</h2>
          <p className="mt-1 text-xs text-muted">Try a conversation without a real phone number.</p>
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted">
        Lead and approval inboxes land here once real conversations start coming in.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <InstallPrompt />
        <PushDemo />
      </div>
    </main>
  );
}
