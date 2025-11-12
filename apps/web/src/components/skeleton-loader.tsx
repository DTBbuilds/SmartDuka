'use client';

export function SkeletonLoader() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Header skeleton */}
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      
      {/* Content skeleton */}
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/6" />
      </div>

      {/* Button skeleton */}
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full mt-4" />
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-3 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1"
        />
      ))}
    </div>
  );
}
