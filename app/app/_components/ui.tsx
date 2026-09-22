import Link from "next/link";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={"rounded-2xl border border-line bg-card shadow-card " + className}>{children}</div>;
}

export function CardHeader({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: { label: string; href: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4 sm:px-6 sm:pt-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        {title}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-accent-blue-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-blue">{count}</span>
        )}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}

export type ChipTone = "blue" | "green" | "amber" | "red" | "pink" | "neutral";

const CHIP_TONE: Record<ChipTone, string> = {
  blue: "bg-gauge-blue-soft text-gauge-blue",
  green: "bg-gauge-green-soft text-gauge-green",
  amber: "bg-gauge-amber-soft text-gauge-amber",
  red: "bg-gauge-red-soft text-gauge-red",
  pink: "bg-gauge-pink-soft text-gauge-pink",
  neutral: "bg-line text-ink-soft",
};

export function Chip({ tone = "neutral", className = "", children }: { tone?: ChipTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${CHIP_TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "md" | "lg";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent-blue font-semibold text-white hover:bg-accent-blue-deep",
  secondary: "border border-line font-semibold text-ink-soft hover:bg-paper",
  danger: "border border-line font-medium text-gauge-red hover:bg-gauge-red-soft",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 w-full px-6 text-[15px]",
};

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className: string): string {
  return `inline-flex items-center justify-center gap-2 rounded-full transition-colors disabled:opacity-60 ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type ?? "button"} {...props} className={buttonClasses(variant, size, className)} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = buttonClasses(variant, size, className);
  // API routes and external protocols (tel:, sms:, https:) must bypass client routing.
  const external = href.startsWith("/api/") || /^[a-z]+:/.test(href);
  if (external) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={"animate-pulse rounded-xl bg-line " + className} />;
}

export function InitialAvatar({ label, className = "h-9 w-9 text-sm" }: { label: string; className?: string }) {
  const initial = (label.match(/[a-zA-Z]/)?.[0] ?? "").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={"flex shrink-0 items-center justify-center rounded-full bg-accent-blue-soft font-semibold text-accent-blue-deep " + className}
    >
      {initial || (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[55%] w-[55%]">
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
