import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(task.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusLabel = String(task.status || "TASK").replace(/_/g, " ");
  const statusClass =
    task.status === "COMPLETED"
      ? "bg-emerald-100 text-emerald-700"
      : task.status === "REVIEW"
        ? "bg-amber-100 text-amber-700"
        : task.status === "IN PROGRESS"
          ? "bg-sky-100 text-sky-700"
          : "bg-slate-100 text-slate-600";

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className={`group cursor-grab rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-[0_1px_4px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isDragging ? "cursor-grabbing ring-2 ring-cyan-200 shadow-[0_18px_40px_rgba(15,23,42,0.2)]" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-5 text-slate-900">{task.title}</p>
          {task.description ? (
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">{task.description}</p>
          ) : null}
        </div>

        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {task.assignee ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{task.assignee}</span> : null}
        {task.dueDate ? <span className="rounded-full bg-slate-100 px-2.5 py-1">Due: {task.dueDate}</span> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClass}`}>
          {statusLabel}
        </span>
        <span className="text-xs text-slate-400 transition group-hover:text-slate-600">Open</span>
      </div>
    </article>
  );
}
