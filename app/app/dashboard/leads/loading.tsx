import { Skeleton } from "@/app/_components/ui";

export default function LeadsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 space-y-2 lg:hidden">
        <Skeleton className="h-[76px] rounded-2xl" />
        <Skeleton className="h-[76px] rounded-2xl" />
        <Skeleton className="h-[76px] rounded-2xl" />
      </div>
      <Skeleton className="mt-6 hidden h-72 rounded-2xl lg:block" />
    </main>
  );
}
