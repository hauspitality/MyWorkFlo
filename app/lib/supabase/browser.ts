import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. Respects RLS via the user's
 * session cookie, same as server.ts — this is just the browser-side half
 * of the same auth flow.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
