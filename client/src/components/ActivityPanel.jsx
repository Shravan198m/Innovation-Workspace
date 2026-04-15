export default function ActivityPanel({ activity = [], loading = false }) {
  return (
    <aside className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Activity</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {activity.length}
        </span>
      </div>

      <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
        {loading ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
            Loading activity...
          </p>
        ) : activity.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
            No activity yet.
          </p>
        ) : (
          activity.slice(0, 50).map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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
