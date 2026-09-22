"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { InitialAvatar } from "@/app/_components/ui";
import { createClient } from "@/lib/supabase/browser";
import type { ControlMode } from "@/lib/supabase/types";

export { InitialAvatar as UserAvatar } from "@/app/_components/ui";

const CONTROL_MODE_LABEL: Record<ControlMode, string> = {
  draft: "Draft mode",
  assisted: "Assisted mode",
  autopilot: "Autopilot",
};

const CONTROL_MODE_DOT: Record<ControlMode, string> = {
  draft: "bg-gauge-blue",
  assisted: "bg-gauge-amber",
  autopilot: "bg-gauge-green",
};

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
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
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      href="/dashboard/approvals"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper hover:text-ink"
      aria-label={count > 0 ? `Approvals — ${count} pending` : "Approvals"}
    >
      <BellIcon className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gauge-red px-1 text-[10px] font-semibold tabular-nums text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function SearchField() {
  return (
    <form action="/dashboard/leads" role="search" className="relative w-full max-w-sm">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        type="search"
        name="q"
        placeholder="Search leads…"
        className="h-10 w-full rounded-full border border-line bg-paper pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent-blue/50 focus:bg-card"
      />
    </form>
  );
}

export function DashboardShell({
  businessName,
  controlMode,
  userEmail,
  pendingApprovalsCount,
  children,
}: {
  businessName: string;
  controlMode: ControlMode;
  userEmail: string;
  pendingApprovalsCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="lg:flex lg:min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-card lg:flex">
        <div className="flex items-center gap-2.5 px-6 pb-2 pt-6">
          <BrandMark className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight text-ink">MyWorkFlo</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors " +
                  (active ? "bg-accent-blue text-white shadow-card" : "text-ink-soft hover:bg-paper hover:text-ink")
                }
              >
                <item.Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line px-3 py-4">
          <div className="px-3.5">
            <p className="truncate text-[13px] font-semibold text-ink">{businessName}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${CONTROL_MODE_DOT[controlMode]}`} />
              <span className="text-xs text-muted">{CONTROL_MODE_LABEL[controlMode]}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2.5 px-3.5">
            <InitialAvatar label={userEmail} className="h-8 w-8 text-xs" />
            <span className="min-w-0 truncate text-[13px] text-ink-soft">{userEmail}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-1.5 w-full rounded-xl px-3.5 py-2 text-left text-[13px] font-medium text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandMark className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-tight text-ink">MyWorkFlo</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell count={pendingApprovalsCount} />
          <Link href="/dashboard/settings" aria-label="Settings">
            <InitialAvatar label={userEmail} className="h-8 w-8 text-xs" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-24 lg:pb-0">
        {/* Desktop top bar */}
        <header className="hidden items-center justify-between gap-6 border-b border-line bg-card px-8 py-3 lg:flex">
          <SearchField />
          <div className="flex items-center gap-3">
            <NotificationBell count={pendingApprovalsCount} />
            <span className="h-6 w-px bg-line" aria-hidden="true" />
            <InitialAvatar label={userEmail} className="h-9 w-9 text-sm" />
          </div>
        </header>
        {children}
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-card/95 backdrop-blur lg:hidden"
        aria-label="Main navigation"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors " +
                (active ? "text-accent-blue" : "text-muted")
              }
            >
              <item.Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
