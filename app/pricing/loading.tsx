import { Skeleton } from "@/components/ui/skeleton";

export default function PricingLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-10 md:px-10 space-y-8">
      <Skeleton className="h-12 w-72" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[420px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
