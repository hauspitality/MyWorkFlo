"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/app/_components/ui";

export function ErrorState({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-card px-6 py-10 text-center shadow-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-8 w-8 text-gauge-amber" aria-hidden>
        <path d="M12 9v4.5M12 16.8v.2" strokeLinecap="round" />
        <path d="M10.3 4.1 3.5 16a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
      </svg>
      <p className="mt-3 text-sm font-medium text-ink-soft">Something went wrong</p>
      <p className="mt-1 text-xs text-muted">Your data is fine — this page just failed to load.</p>
      <div className="mt-5 flex items-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/dashboard" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
