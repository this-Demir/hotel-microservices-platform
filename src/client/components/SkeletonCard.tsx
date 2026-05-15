export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden ring-1 ring-slate-200/70">
      <div className="grid sm:grid-cols-[280px_1fr]">
        <div className="h-52 skeleton-shimmer" />
        <div className="p-5">
          <div className="h-5 w-2/3 rounded skeleton-shimmer" />
          <div className="h-3 w-1/3 mt-2 rounded skeleton-shimmer" />
          <div className="h-3 w-full mt-4 rounded skeleton-shimmer" />
          <div className="h-3 w-5/6 mt-2 rounded skeleton-shimmer" />
          <div className="flex justify-between items-end mt-6">
            <div className="h-3 w-24 rounded skeleton-shimmer" />
            <div className="h-9 w-28 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}
