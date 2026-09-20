import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely — this is the client
 * for Twilio/Stripe webhooks and the AI engine, none of which run in a user
 * session. NEVER import this from a Client Component or expose the key to
 * the browser. Every caller of this client is responsible for its own
 * tenant-scoping (e.g. always filtering by business_id explicitly) since
 * the database will not do it for you here.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
