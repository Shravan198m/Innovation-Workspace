export default function SkeletonCard() {
  return (
    <div className="glass-card animate-pulse rounded-[16px] p-5">
      <div className="mb-3 h-1.5 rounded-full bg-slate-300" />
      <div className="mb-3 h-5 w-2/3 rounded bg-slate-200" />
      <div className="mb-5 h-4 w-1/2 rounded bg-slate-200/80" />
      <div className="mb-3 h-2 w-full rounded-full bg-slate-200/90" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-slate-200/90" />
        <div className="h-3 w-16 rounded bg-slate-200/90" />
      </div>
    </div>
  );
}
