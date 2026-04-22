export default function ProgressBar({ value = 0 }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
