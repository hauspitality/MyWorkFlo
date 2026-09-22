import { Skeleton } from "@/app/_components/ui";

export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-6 h-48 rounded-2xl" />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
