import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/app/_components/shell/dashboard-shell";
import type { ControlMode } from "@/lib/supabase/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();

  const [{ data: business }, { count: pendingApprovals }] = staffRow
    ? await Promise.all([
        supabase.from("businesses").select("name, control_mode").eq("id", staffRow.business_id).single(),
        supabase.from("approval_queue").select("id", { count: "exact", head: true }).eq("business_id", staffRow.business_id).eq("status", "pending"),
      ])
    : [{ data: null }, { count: 0 }];

  return (
    <DashboardShell
      businessName={business?.name?.trim() ?? "Set up your business"}
      controlMode={(business?.control_mode as ControlMode) ?? "draft"}
      userEmail={user.email ?? ""}
      pendingApprovalsCount={pendingApprovals ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
