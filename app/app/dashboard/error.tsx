"use client";

import { ErrorState } from "@/app/_components/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <ErrorState error={error} reset={reset} />
    </main>
  );
}
