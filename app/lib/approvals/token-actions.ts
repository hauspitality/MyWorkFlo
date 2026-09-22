"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { resolveApproval, type ResolveApprovalResult } from "@/lib/approvals/resolve";

/**
 * Magic-link resolution for the unauthenticated /a/[token] page. No session
 * check by design — possession of the unguessable single-use token is the
 * authorization, mirroring how the link was delivered (SMS to staff).
 */
async function resolveByToken(token: string, approve: boolean): Promise<ResolveApprovalResult> {
  if (!token) return { ok: false, error: "Missing link token" };

  const db = createServiceClient();
  const { data: approval } = await db.from("approval_queue").select("id").eq("magic_link_token", token).maybeSingle();
  if (!approval) return { ok: false, error: "This link isn't valid" };

  return resolveApproval({
    approvalId: approval.id,
    approve,
    respondedBy: null,
    responseChannel: "magic_link",
  });
}

export async function approveByTokenAction(token: string): Promise<ResolveApprovalResult> {
  return resolveByToken(token, true);
}

export async function declineByTokenAction(token: string): Promise<ResolveApprovalResult> {
  return resolveByToken(token, false);
}
