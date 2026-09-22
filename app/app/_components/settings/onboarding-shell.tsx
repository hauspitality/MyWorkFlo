import type { ReactNode } from "react";

const STEPS = [
  "Business",
  "Hours",
  "Service area",
  "Appointment types",
  "Emergency keywords",
  "Control mode",
  "Calendar",
  "Plan",
];

export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-full flex-1 items-start justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <svg viewBox="0 0 100 100" className="h-7 w-7" aria-hidden="true">
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

        <div className="mb-4 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={"h-1 flex-1 rounded-full " + (i <= step ? "bg-accent-blue" : "bg-line")} />
          ))}
        </div>
        <p className="mb-1 text-sm text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mb-1 text-xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mb-6 text-sm text-muted">{subtitle}</p>}
        {!subtitle && <div className="mb-4" />}

        {children}
      </div>
    </main>
  );
}
