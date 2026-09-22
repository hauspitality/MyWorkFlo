"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { createClient } from "@/lib/supabase/browser";
import type { ControlMode } from "@/lib/supabase/types";

const CONTROL_MODE_LABEL: Record<ControlMode, string> = {
  draft: "Draft",
  assisted: "Assisted",
  autopilot: "Autopilot",
};

const CONTROL_MODE_DOT: Record<ControlMode, string> = {
  draft: "bg-accent-blue",
  assisted: "bg-brass",
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

function NotificationBell({ count, className }: { count: number; className?: string }) {
  return (
    <Link href="/dashboard/approvals" className={"relative inline-flex items-center justify-center text-ink-soft hover:text-ink " + className} aria-label="Approvals">
      <BellIcon className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gauge-red px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export function UserAvatar({ label, className }: { label: string; className?: string }) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={
        "flex shrink-0 items-center justify-center rounded-full bg-brass-soft text-sm font-semibold text-brass-deep " + className
      }
      aria-hidden="true"
    >
      {initial}
    </span>
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
    <div className="lg:flex lg:min-h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-card lg:flex">
        <div className="border-b border-line px-5 py-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BrandMark className="h-6 w-6" />
              <span className="text-base font-semibold text-ink">MyWorkFlo</span>
            </div>
            <NotificationBell count={pendingApprovalsCount} />
          </div>
          <p className="mt-3 truncate text-sm font-medium text-ink-soft">{businessName}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${CONTROL_MODE_DOT[controlMode]}`} />
            <span className="text-xs text-muted">{CONTROL_MODE_LABEL[controlMode]} mode</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                  (active ? "bg-accent-blue/10 text-accent-blue" : "text-ink-soft hover:bg-paper hover:text-ink")
                }
              >
                <item.Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line px-3 py-4">
          <div className="flex items-center gap-2.5 px-3">
            <UserAvatar label={userEmail} className="h-8 w-8" />
            <span className="truncate text-sm text-ink-soft">{userEmail}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted hover:bg-paper hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <BrandMark className="h-5 w-5" />
          <span className="text-sm font-semibold text-ink">MyWorkFlo</span>
        </div>
        <NotificationBell count={pendingApprovalsCount} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-card lg:hidden"
        aria-label="Main navigation"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={"flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium " + (active ? "text-accent-blue" : "text-muted")}
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
