export default function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-white/45 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 ${className}`}
    >
      {children}
    </span>
  );
}
