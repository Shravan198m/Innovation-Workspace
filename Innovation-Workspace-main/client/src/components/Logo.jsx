export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(15,23,42,0.35)]">
        IH
      </div>
      {!compact && (
        <div>
          <p className="text-sm font-semibold text-slate-900">Innovation Hub OS</p>
          <p className="text-xs text-slate-500">Academic Project Platform</p>
        </div>
      )}
    </div>
  );
}
