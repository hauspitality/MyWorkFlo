import { Skeleton } from "@/app/_components/ui";

export default function ActivityLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-6 h-96 rounded-2xl" />
    </main>
  );
}
