import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processInboundMessage } from "@/lib/messaging/process-inbound";

/**
 * Dev-only route: runs an inbound customer text through the exact
 * production pipeline (lib/messaging/process-inbound.ts — the same module
 * the real Twilio SMS webhook calls), minus actual SMS delivery. This is
 * how the pipeline gets validated without a phone number.
 *
 * Auth: the caller must be a logged-in staff member of the target business
 * (checked via the session client, RLS-scoped). The pipeline itself writes
 * with the service-role client, exactly as in production.
 */

const requestSchema = z.object({
  businessId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  controlMode: z.enum(["draft", "assisted", "autopilot"]).optional(),
  language: z.string().optional(),
  phone: z.string().min(3).default("+15555550100"),
  body: z.string().min(1, "Message body is required"),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_SIMULATOR !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;

  const staffQuery = supabase.from("staff").select("business_id").eq("user_id", user.id).eq("is_active", true);
  const { data: staffRow } = input.businessId
    ? await staffQuery.eq("business_id", input.businessId).maybeSingle()
    : await staffQuery.limit(1).maybeSingle();

  if (!staffRow) {
    return NextResponse.json(
      { error: "No business found for this account. Seed a dev business first." },
      { status: 404 },
    );
  }

  let result;
  try {
    result = await processInboundMessage({
      businessId: staffRow.business_id,
      fromPhone: input.phone,
      body: input.body,
      conversationId: input.conversationId,
      controlModeOverride: input.controlMode,
      language: input.language,
      // No deliver callback: simulator persists outbound messages without sending.
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Pipeline failed" }, { status: 500 });
  }

  const db = createServiceClient();
  const { data: thread } = await db
    .from("messages")
    .select("id, direction, sender, body, status, ai_metadata, created_at")
    .eq("conversation_id", result.conversationId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    conversationId: result.conversationId,
    controlMode: result.controlMode,
    decision: result.decision,
    shortCircuited: result.shortCircuited,
    toolCallsThisTurn: result.toolCallsThisTurn,
    actionPlan: result.plan,
    thread: thread ?? [],
  });
}
