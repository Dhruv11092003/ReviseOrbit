export function TaskCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 w-24 bg-[var(--surface-2)] rounded" />
        <div className="h-5 w-16 bg-[var(--surface-2)] rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-[var(--surface-2)] rounded mb-2" />
      <div className="h-3.5 w-1/2 bg-[var(--surface-2)] rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-[var(--surface-2)] rounded-lg" />
        <div className="h-8 w-24 bg-[var(--surface-2)] rounded-lg" />
      </div>
    </div>
  );
}

export function TaskListSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse">
      <div className="h-3.5 w-20 bg-[var(--surface-2)] rounded mb-3" />
      <div className="h-8 w-14 bg-[var(--surface-2)] rounded" />
    </div>
  );
}
