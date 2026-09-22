import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  OAUTH_NONCE_COOKIE,
  OAUTH_NONCE_COOKIE_OPTIONS,
  exchangeCodeAndStore,
  verifyOAuthState,
} from "@/lib/calendar/google";

/**
 * Google OAuth redirect target. Tenant identity comes from the
 * HMAC-signed state minted by the connect route — not from the session —
 * but completion additionally requires the nonce cookie set by connect to
 * match the state's nonce (CSRF guard: an attacker-minted state can't be
 * completed in a victim's browser), and when a session IS present the
 * user must be active staff of the state's business. The cookie is
 * cleared on every outcome so a state is single-use.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = (result: "connected" | "error") => {
    const response = NextResponse.redirect(
      new URL(`/dashboard/settings?calendar=${result}`, request.url),
    );
    response.cookies.set(OAUTH_NONCE_COOKIE, "", { ...OAUTH_NONCE_COOKIE_OPTIONS, maxAge: 0 });
    return response;
  };

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || searchParams.get("error")) return redirectTo("error");

  const payload = verifyOAuthState(state);
  if (!payload) return redirectTo("error");

  const nonceCookie = request.cookies.get(OAUTH_NONCE_COOKIE)?.value;
  if (!nonceCookie || nonceCookie !== payload.nonce) return redirectTo("error");

  // The nonce already binds this callback to the browser that started the
  // flow; when that browser also carries a session, require it to belong to
  // an active staff member of the state's business.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .eq("business_id", payload.businessId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!staffRow) return redirectTo("error");
  }

  try {
    await exchangeCodeAndStore({ code, businessId: payload.businessId, staffId: payload.staffId });
  } catch {
    return redirectTo("error");
  }

  return redirectTo("connected");
}
