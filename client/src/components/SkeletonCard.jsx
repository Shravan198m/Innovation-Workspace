export default function SkeletonCard() {
  return (
    <div className="glass-card rounded-[22px] p-5 animate-pulse">
      <div className="mb-3 h-2 rounded-xl bg-gradient-to-r from-blue-500/30 to-cyan-500/30" />
      <div className="mb-3 h-5 w-2/3 rounded bg-white/55" />
      <div className="mb-5 h-4 w-1/2 rounded bg-white/45" />
      <div className="mb-3 h-2 w-full rounded-full bg-white/35" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-white/40" />
        <div className="h-3 w-16 rounded bg-white/40" />
      </div>
    </div>
  );
}
