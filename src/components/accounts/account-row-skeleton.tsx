import { Skeleton } from "@/components/ui/skeleton"

export function AccountRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="size-8 rounded-md" />
    </div>
  )
}
