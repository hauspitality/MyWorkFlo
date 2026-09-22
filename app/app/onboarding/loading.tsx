import { Skeleton } from "@/app/_components/ui";

export default function OnboardingLoading() {
  return (
    <main className="flex min-h-full flex-1 items-start justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-6 h-1.5 w-full rounded-full" />
        <Skeleton className="mt-4 h-4 w-24" />
        <Skeleton className="mt-2 h-7 w-64 max-w-full" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      </div>
    </main>
  );
}
