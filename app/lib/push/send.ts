import "server-only";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToRows(rows: SubscriptionRow[], payload: PushPayload) {
  const supabase = createServiceClient();

  const results = await Promise.allSettled(
    rows.map((row) =>
      webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify(payload),
      ),
    ),
  );

  const staleIds = rows
    .filter((_, i) => {
      const result = results[i];
      return (
        result.status === "rejected" &&
        (result.reason?.statusCode === 404 || result.reason?.statusCode === 410)
      );
    })
    .map((row) => row.id);

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    pruned: staleIds.length,
    failed: results.filter((result) => result.status === "rejected").length - staleIds.length,
  };
}

export async function sendPushToBusiness(businessId: string, payload: PushPayload) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("business_id", businessId);

  if (error) throw error;
  return sendToRows(data ?? [], payload);
}

export async function sendPushToStaff(staffId: string, payload: PushPayload) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("staff_id", staffId);

  if (error) throw error;
  return sendToRows(data ?? [], payload);
}
