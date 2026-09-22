"use client";

import { ErrorState } from "@/app/_components/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <ErrorState error={error} reset={reset} />
      </div>
    </main>
  );
}
