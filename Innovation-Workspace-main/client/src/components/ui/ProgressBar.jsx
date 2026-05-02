export default function ProgressBar({ value = 0 }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-2 rounded-full bg-[#1e3a8a] transition-all duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
