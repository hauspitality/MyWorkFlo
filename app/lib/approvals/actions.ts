"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveApproval, type ResolveApprovalResult } from "@/lib/approvals/resolve";

/**
 * Dashboard Approve/Decline. The approval is fetched with the service client
 * (its business_id is needed before we know the caller may see it), then the
 * caller must prove active-staff membership of that business via the session
 * client before anything is resolved.
 */
async function resolveAsStaff(approvalId: string, approve: boolean): Promise<ResolveApprovalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const db = createServiceClient();
  const { data: approval } = await db.from("approval_queue").select("business_id").eq("id", approvalId).maybeSingle();
  if (!approval) return { ok: false, error: "Approval not found" };

  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("business_id", approval.business_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!staff) return { ok: false, error: "You don't have access to this approval" };

  const result = await resolveApproval({
    approvalId,
    approve,
    respondedBy: staff.id,
    responseChannel: null,
  });
  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard/leads", "layout");
  return result;
}

export async function approveApprovalAction(approvalId: string): Promise<ResolveApprovalResult> {
  return resolveAsStaff(approvalId, true);
}

export async function declineApprovalAction(approvalId: string): Promise<ResolveApprovalResult> {
  return resolveAsStaff(approvalId, false);
}
