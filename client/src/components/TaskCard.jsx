import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(task.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusLabel = String(task.status || "todo").replace(/_/g, " ");
  const statusText = statusLabel.toUpperCase();
  const taskType = String(task.taskType || "weekly").toLowerCase() === "daily" ? "DAILY" : "WEEKLY";
  const statusClass =
    task.status === "completed"
      ? "bg-cyan-100 text-cyan-700"
      : task.status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : task.status === "submitted"
        ? "bg-amber-100 text-amber-700"
        : task.status === "rejected"
            ? "bg-rose-100 text-rose-700"
            : "bg-slate-100 text-slate-600";

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className={`group cursor-grab rounded-[18px] border border-white/50 bg-white/72 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/88 hover:shadow-[0_16px_32px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isDragging ? "cursor-grabbing ring-2 ring-cyan-200 shadow-[0_18px_40px_rgba(15,23,42,0.2)]" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="heading-font break-words text-sm font-bold tracking-tight text-slate-900">{task.title}</h4>
          {task.description ? (
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">{task.description}</p>
          ) : null}
        </div>

        <span className="glass-pill rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
          {statusText}
        </span>
      </div>

      <div className="mt-3 grid gap-1.5 text-xs text-slate-500">
        <span className="glass-pill w-fit rounded-full px-2.5 py-1 font-semibold text-slate-700">{taskType}</span>
        {task.createdBy ? <span className="glass-pill w-fit rounded-full px-2.5 py-1">Added by: {task.createdBy}</span> : null}
        {task.assignee ? <span className="glass-pill w-fit rounded-full px-2.5 py-1">{task.assignee}</span> : null}
        {task.dueDate ? <span className="glass-pill w-fit rounded-full px-2.5 py-1">Due: {task.dueDate}</span> : null}
      </div>

      {task.status === "rejected" && task.rejectionReason ? (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          Reason: {task.rejectionReason}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClass}`}>
          {statusText}
        </span>
        <span className="text-xs text-slate-400 transition group-hover:text-slate-600">Open</span>
      </div>
    </motion.article>
  );
}
