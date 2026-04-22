/**
 * StatusBadge Component
 * Displays task status with color-coded styling based on workflow state
 * 
 * Task Workflow:
 *   todo → in_progress → submitted → approved/rejected
 * 
 * Props:
 *   - status: Task status ('todo', 'in_progress', 'submitted', 'approved', 'rejected')
 *   - size: Badge size ('sm', 'md', 'lg') - default 'md'
 *   - variant: Display style ('pill' or 'badge') - default 'pill'
 */

const STATUS_STYLES = {
  todo: "bg-slate-100 text-slate-800 border-slate-200",
  in_progress: "bg-sky-100 text-sky-800 border-sky-200",
  submitted: "bg-amber-100 text-amber-800 border-amber-200",
  mentor_approved: "bg-cyan-100 text-cyan-800 border-cyan-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
};

const STATUS_ICONS = {
  todo: "○",
  in_progress: "◐",
  submitted: "◑",
  mentor_approved: "◎",
  approved: "✓",
  completed: "✓",
  rejected: "✕",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-2 text-base",
};

export default function StatusBadge({ status = "todo", size = "md", variant = "pill" }) {
  const normalStatus = String(status || "todo")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "_");

  const style = STATUS_STYLES[normalStatus] || "bg-slate-100 text-slate-800 border-slate-200";
  const icon = STATUS_ICONS[normalStatus] || "○";
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  const displayLabel = normalStatus.replace(/_/g, " ").toUpperCase();

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-[0.12em] ${sizeClass} ${style}`}
      title={`Status: ${displayLabel}`}
    >
      <span className="mr-1.5">{icon}</span>
      {displayLabel}
    </span>
  );
}
