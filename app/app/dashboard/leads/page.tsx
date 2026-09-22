import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Chip, InitialAvatar } from "@/app/_components/ui";
import { CONVERSATION_STATUS_LABEL, CONVERSATION_STATUS_TONE } from "@/app/_components/conversation-status";
import { formatPhone, formatRelative, humanizeCode } from "@/lib/format";
import { LeadRow } from "./lead-row";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, status, matched_issue_code, turn_count, detected_language, last_message_at, leads(name, source_phone_number)")
    .eq("business_id", staffRow.business_id)
    .order("last_message_at", { ascending: false })
    .limit(50);

  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const rows = (conversations ?? [])
    .map((c) => {
      const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
      return { ...c, lead };
    })
    .filter((c) => {
      if (!query) return true;
      return [c.lead?.name, c.lead?.source_phone_number, c.matched_issue_code]
        .some((field) => field?.toLowerCase().includes(query));
    });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Leads</h1>
          <p className="mt-1 text-sm text-muted">
            {query ? (
              <>
                Results for &ldquo;{q}&rdquo; &middot;{" "}
                <Link href="/dashboard/leads" className="font-medium text-accent-blue hover:text-accent-blue-deep">
                  Clear
                </Link>
              </>
            ) : (
              "Every customer conversation, most recent first."
            )}
          </p>
        </div>
      </div>

      {/* Mobile search */}
      <form action="/dashboard/leads" role="search" className="mt-4 lg:hidden">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search leads…"
          aria-label="Search leads"
          className="h-10 w-full rounded-full border border-line bg-card px-4 text-sm text-ink shadow-card outline-none placeholder:text-faint focus:border-accent-blue/50"
        />
      </form>

      {!rows.length ? (
        <Card className="mt-4 px-6 py-10 text-center lg:mt-6">
          <p className="text-sm font-medium text-ink-soft">{query ? "No matching leads" : "No conversations yet"}</p>
          <p className="mt-1 text-xs text-muted">
            {query ? (
              "Try a different name, phone number, or issue."
            ) : (
              <>
                Real conversations land here once texts start coming in, or try the{" "}
                <Link href="/dashboard/dev/simulate" className="font-medium text-accent-blue hover:text-accent-blue-deep">
                  SMS simulator
                </Link>
                .
              </>
            )}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="mt-3 space-y-2 lg:hidden">
            {rows.map((c) => (
              <Link key={c.id} href={`/dashboard/leads/${c.id}`} className="block">
                <Card className="flex items-center gap-3 p-4">
                  <InitialAvatar label={c.lead?.name || c.lead?.source_phone_number || "?"} className="h-9 w-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {c.lead?.name || formatPhone(c.lead?.source_phone_number) || "Unknown"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {humanizeCode(c.matched_issue_code, "Not yet determined")} &middot; {formatRelative(c.last_message_at)}
                    </p>
                  </div>
                  <Chip tone={CONVERSATION_STATUS_TONE[c.status] ?? "neutral"} className="shrink-0">
                    {CONVERSATION_STATUS_LABEL[c.status] ?? humanizeCode(c.status)}
                  </Chip>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="mt-6 hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-6 py-3.5 font-medium">Customer</th>
                  <th className="px-4 py-3.5 font-medium">Issue</th>
                  <th className="px-4 py-3.5 font-medium">Messages</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 text-right font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <LeadRow key={c.id} href={`/dashboard/leads/${c.id}`} className="border-t border-line transition-colors hover:bg-paper/60">
                    <td className="px-6 py-3">
                      <Link href={`/dashboard/leads/${c.id}`} className="group flex items-center gap-3">
                        <InitialAvatar label={c.lead?.name || c.lead?.source_phone_number || "?"} className="h-9 w-9 text-xs" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink group-hover:text-accent-blue">
                            {c.lead?.name || formatPhone(c.lead?.source_phone_number) || "Unknown"}
                          </span>
                          {c.lead?.name && (
                            <span className="block truncate text-xs tabular-nums text-muted">{formatPhone(c.lead.source_phone_number)}</span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {humanizeCode(c.matched_issue_code, "Not yet determined")}
                      {c.detected_language && c.detected_language !== "en" ? (
                        <span className="ml-2 text-xs uppercase text-muted">{c.detected_language}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-soft">{c.turn_count}</td>
                    <td className="px-4 py-3">
                      <Chip tone={CONVERSATION_STATUS_TONE[c.status] ?? "neutral"}>
                        {CONVERSATION_STATUS_LABEL[c.status] ?? humanizeCode(c.status)}
                      </Chip>
                    </td>
                    <td className="px-6 py-3 text-right text-xs tabular-nums text-muted">{formatRelative(c.last_message_at)}</td>
                  </LeadRow>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </main>
  );
}
