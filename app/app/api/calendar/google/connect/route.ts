import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  OAUTH_NONCE_COOKIE,
  OAUTH_NONCE_COOKIE_OPTIONS,
  buildConnectUrl,
  createOAuthState,
  isGoogleCalendarConfigured,
} from "@/lib/calendar/google";

/**
 * Starts the Google Calendar OAuth flow for the logged-in staff member's
 * business. The signed state binds the callback to this business/staff so
 * the (public) callback route can't be replayed against another tenant, and
 * a single-use nonce (state + HttpOnly cookie) ties completion to the
 * browser that started the flow (CSRF guard).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar is not configured" }, { status: 503 });
  }

  const { data: staffRow } = await supabase
    .from("staff")
    .select("id, business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!staffRow) {
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", request.url));
  }

  const nonce = randomBytes(16).toString("base64url");
  const state = createOAuthState({ businessId: staffRow.business_id, staffId: staffRow.id, nonce });
  const response = NextResponse.redirect(buildConnectUrl(state));
  response.cookies.set(OAUTH_NONCE_COOKIE, nonce, OAUTH_NONCE_COOKIE_OPTIONS);
  return response;
}
