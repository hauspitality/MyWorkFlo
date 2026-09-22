export interface NavIconProps {
  className?: string;
}

export function HomeIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5a2 2 0 1 1 4 0v5h3a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LeadsIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path
        d="M4 19.5V6a2 2 0 0 1 2-2h9l5 5v10.5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

export function ApprovalsIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8.5 12.5 2.3 2.3L15.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SettingsIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M4 7h10M17 7h3M4 12h3M9 12h11M4 17h13M20 17h0" strokeLinecap="round" />
      <circle cx="14" cy="7" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
    </svg>
  );
}

export interface NavItem {
  href: string;
  label: string;
  Icon: (props: NavIconProps) => React.ReactElement;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/dashboard/leads", label: "Leads", Icon: LeadsIcon },
  { href: "/dashboard/approvals", label: "Approvals", Icon: ApprovalsIcon },
  { href: "/dashboard/settings", label: "Settings", Icon: SettingsIcon },
];
