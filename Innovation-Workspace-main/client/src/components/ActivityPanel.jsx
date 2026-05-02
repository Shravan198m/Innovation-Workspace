export default function ActivityPanel({ activity = [], loading = false, className = "", compact = false }) {
  return (
    <aside className={`glass-card flex h-full min-h-0 flex-col rounded-[16px] p-3.5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`font-semibold uppercase text-slate-500 ${compact ? "text-xs tracking-[0.14em]" : "text-sm tracking-[0.2em]"}`}>
          Activity
        </h3>
        <span className="glass-pill rounded-full px-2.5 py-1 text-xs font-semibold">
          {activity.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
        {loading ? (
          <p className="glass-surface rounded-xl border-dashed px-3 py-3 text-sm text-slate-500">
            Loading activity...
          </p>
        ) : activity.length === 0 ? (
          <div className="glass-surface rounded-xl border-dashed px-4 py-5 text-center text-sm text-slate-500">
            <p className="text-base font-semibold text-slate-700">No activity yet</p>
            <p className="mt-1">Start by adding your first task.</p>
          </div>
        ) : (
          activity.slice(0, 50).map((entry) => (
            <article key={entry.id} className="glass-surface rounded-xl p-3">
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-slate-900">{entry.userName}</span> {entry.action}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Just now"}
              </p>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
