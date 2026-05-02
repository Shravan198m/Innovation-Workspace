import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

function formatDisplayName(value, fallback = "Unassigned") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return fallback;
  }

  const source = normalized.includes("@") ? normalized.split("@")[0] : normalized;
  return source
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "U";
  }

  const words = source.replace(/[@._-]+/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return source.slice(0, 2).toUpperCase();
  }

  return words.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function getTaskTypeLabel(taskType) {
  const normalized = String(taskType || "weekly").trim().toLowerCase();

  if (normalized === "daily") {
    return "Daily Report";
  }

  if (normalized === "task") {
    return "Task";
  }

  return "Weekly Report";
}

function getTypeTagClasses(taskType) {
  const normalized = String(taskType || "weekly").trim().toLowerCase();

  if (normalized === "daily") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (normalized === "task") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(task.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const normalizedStatus = String(task.status || "todo").toLowerCase();
  const statusText =
    normalizedStatus === "todo"
      ? "To Do"
      : normalizedStatus === "submitted"
        ? "Submitted"
        : normalizedStatus === "completed"
          ? "Completed"
          : normalizedStatus === "rejected"
            ? "Rejected"
            : "To Do";
  const assigneeName = formatDisplayName(task.assignee || task.createdBy || "");
  const assigneeInitials = getInitials(assigneeName);
  const typeLabel = getTaskTypeLabel(task.taskType);
  const typeTagClasses = getTypeTagClasses(task.taskType);
  const dateTag = task.dueDate ? String(task.dueDate) : "No date";
  const statusClass =
    normalizedStatus === "completed" || normalizedStatus === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : normalizedStatus === "submitted"
        ? "bg-sky-100 text-sky-700"
        : normalizedStatus === "rejected"
          ? "bg-rose-100 text-rose-700"
          : "bg-amber-100 text-amber-700";

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
      className={`group cursor-grab rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isDragging ? "cursor-grabbing ring-2 ring-cyan-200 shadow-[0_18px_40px_rgba(15,23,42,0.2)]" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${typeTagClasses}`}>
            {typeLabel}
          </span>
          <h4 className="heading-font break-words text-[13px] font-semibold tracking-tight text-slate-900">{task.title}</h4>
          {task.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{task.description}</p> : null}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{dateTag}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e3a8a] text-[11px] font-semibold text-white">
            {assigneeInitials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-700">Assigned to: {assigneeName}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>
          {statusText}
        </span>
      </div>

      {task.status === "rejected" && task.rejectionReason ? (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          Reason: {task.rejectionReason}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="text-[11px] text-slate-400 transition group-hover:text-slate-600">Open</span>
      </div>
    </motion.article>
  );
}
