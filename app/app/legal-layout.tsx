import Link from "next/link";
import type { ReactNode } from "react";

/** Shared shell for the public legal pages (privacy, terms). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="https://myworkflo.com" className="flex items-center gap-2.5">
        <svg viewBox="0 0 100 100" className="h-7 w-7" aria-hidden="true">
          <circle cx="50" cy="50" r="37" fill="none" stroke="#96692c" strokeWidth="7" />
          <line x1="50" y1="10" x2="50" y2="22" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
          <line x1="24" y1="22" x2="31" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
          <line x1="76" y1="22" x2="69" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
          <line x1="50" y1="50" x2="67" y2="28" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
          <circle cx="50" cy="50" r="7" fill="#96692c" />
          <polyline points="18,64 35,42 50,60 65,42 82,64" fill="none" stroke="#96692c" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-lg font-semibold text-ink">MyWorkFlo</span>
      </Link>
      <h1 className="mt-8 text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated: {updated}</p>
      <div className="prose-legal mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </main>
  );
}
