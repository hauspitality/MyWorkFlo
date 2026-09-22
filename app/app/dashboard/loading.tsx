import { Skeleton } from "@/app/_components/ui";

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="mt-2 h-9 w-72 max-w-full" />
      <Skeleton className="mt-6 h-[72px] w-full rounded-2xl sm:rounded-full" />
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </main>
  );
}
