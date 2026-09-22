"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPushToStaff } from "@/lib/push/send";

interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

async function requireCurrentStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!staff) throw new Error("No staff record for this account yet");

  return { supabase, staff };
}

export async function subscribeUser(subscription: PushSubscriptionJSON) {
  const { supabase, staff } = await requireCurrentStaff();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      business_id: staff.business_id,
      staff_id: staff.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) throw error;
  return { success: true };
}

export async function unsubscribeUser(endpoint: string) {
  const { supabase } = await requireCurrentStaff();

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) throw error;
  return { success: true };
}

export async function sendTestNotification(message: string) {
  const { staff } = await requireCurrentStaff();

  return sendPushToStaff(staff.id, {
    title: "MyWorkFlo test",
    body: message,
  });
}
