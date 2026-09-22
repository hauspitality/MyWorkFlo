import { createServiceClient } from "@/lib/supabase/service";
import { TokenButtons } from "./token-buttons";

// Approval state must always be read fresh — a stale render here could show
// Approve buttons for an already-resolved request.
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  outbound_message: "Message needs approval",
  booking: "Booking needs approval",
  emergency_escalation: "Emergency escalation",
  other_exception: "Needs review",
};

export default async function MagicLinkApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: approval } = await db
    .from("approval_queue")
    .select("id, business_id, type, status, payload, requested_at, expires_at")
    .eq("magic_link_token", token)
    .maybeSingle();

  if (!approval) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-semibold text-ink">This link isn&rsquo;t valid</h1>
        <p className="text-sm text-ink-soft">
          Check that the link was copied completely, or handle the request from your dashboard instead.
        </p>
      </Shell>
    );
  }

  if (approval.status === "approved" || approval.status === "rejected") {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-semibold text-ink">
          Already {approval.status === "approved" ? "approved" : "declined"}
        </h1>
        <p className="text-sm text-ink-soft">This request has been handled. Nothing else to do here.</p>
      </Shell>
    );
  }

  if (isExpired(approval.status, approval.expires_at)) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-semibold text-ink">This request expired</h1>
        <p className="text-sm text-ink-soft">
          Approval requests expire 15 minutes after they&rsquo;re sent. If it&rsquo;s still relevant, pick the
          conversation back up from your dashboard.
        </p>
      </Shell>
    );
  }

  const payload = (approval.payload ?? {}) as Record<string, unknown>;
  const summary = await buildSummary(approval.type, payload, approval.business_id);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-gauge-amber-soft px-2.5 py-1 text-xs font-medium text-gauge-amber">
          {TYPE_LABEL[approval.type] ?? approval.type}
        </span>
      </div>
      <p className="rounded-md border border-line bg-paper p-3 text-sm text-ink">{summary}</p>
      <div className="mt-5">
        <TokenButtons token={token} approvalType={approval.type} />
      </div>
    </Shell>
  );
}

// This page is force-dynamic, so an at-request-time clock read is correct here.
function isExpired(status: string, expiresAt: string): boolean {
  return status === "auto_expired" || new Date(expiresAt).getTime() <= Date.now();
}

async function buildSummary(type: string, payload: Record<string, unknown>, businessId: string): Promise<string> {
  if (type === "booking") {
    const appointmentTypeId = typeof payload.appointment_type_id === "string" ? payload.appointment_type_id : null;
    const startIso = typeof payload.start === "string" ? payload.start : null;
    if (!appointmentTypeId || !startIso) return "Booking request — see your dashboard for details.";

    const db = createServiceClient();
    const [{ data: apptType }, { data: business }] = await Promise.all([
      db.from("appointment_types").select("name").eq("id", appointmentTypeId).eq("business_id", businessId).maybeSingle(),
      db.from("businesses").select("timezone").eq("id", businessId).maybeSingle(),
    ]);
    return `${apptType?.name ?? "Service visit"} — ${formatWhen(startIso, business?.timezone)}`;
  }

  if (typeof payload.draft_text === "string") return payload.draft_text;
  if (typeof payload.reason === "string") return payload.reason;
  return "See your dashboard for details.";
}

function formatWhen(startIso: string, timezone: string | null | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return new Date(startIso).toLocaleString("en-US", { ...options, timeZone: timezone ?? "America/New_York" });
  } catch {
    return new Date(startIso).toLocaleString("en-US", { ...options, timeZone: "UTC" });
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <svg viewBox="0 0 100 100" className="h-8 w-8" aria-hidden="true">
            <circle cx="50" cy="50" r="37" fill="none" stroke="#96692c" strokeWidth="7" />
            <line x1="50" y1="10" x2="50" y2="22" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <line x1="24" y1="22" x2="31" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <line x1="76" y1="22" x2="69" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <line x1="50" y1="50" x2="67" y2="28" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <circle cx="50" cy="50" r="7" fill="#96692c" />
            <polyline
              points="18,64 35,42 50,60 65,42 82,64"
              fill="none"
              stroke="#96692c"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg font-semibold">MyWorkFlo</span>
        </div>
        <div className="rounded-lg border border-line bg-card p-6">{children}</div>
      </div>
    </main>
  );
}
