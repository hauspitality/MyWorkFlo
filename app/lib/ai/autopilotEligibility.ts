import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The impure half of Autopilot's booking gate — real DB/calendar reads.
 * decide-action.ts stays a pure, synchronous, unit-testable function by
 * taking this result as a plain boolean input rather than doing I/O
 * itself. Call this once per turn, only when decision.booking_ready is
 * true and controlMode is 'autopilot'.
 */
export async function checkAutopilotEligibility(
  businessId: string,
  appointmentTypeId: string,
): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: appointmentType } = await supabase
    .from("appointment_types")
    .select("auto_bookable")
    .eq("id", appointmentTypeId)
    .eq("business_id", businessId)
    .single();

  if (!appointmentType?.auto_bookable) return false;

  // Autopilot booking requires a real, active calendar connection — per
  // the product decision, it falls back to Assisted-style approval
  // otherwise rather than booking into a void or nothing at all.
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("status")
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(connection);
}
