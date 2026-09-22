import { Skeleton } from "@/app/_components/ui";

export default function LeadDetailLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-[88px] rounded-2xl" />
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-2xl lg:col-start-3" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-2 lg:col-start-1 lg:row-start-1" />
      </div>
    </main>
  );
}
