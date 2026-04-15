import { Link } from "react-router-dom";

export default function ProjectCard({ project }) {
  const dueDateLabel = project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "TBD";

  return (
    <article className="group rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{project.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{project.department}</p>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          {project.progress}%
        </span>
      </div>

      <div className="mt-4">
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{project.progress}% completed</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{project.teamCount || project.team || 0} members</span>
        <span>Due {dueDateLabel}</span>
      </div>

      <div className="mt-4">
        <Link
          to={`/projects/${project.id}/board`}
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Open Workspace
        </Link>
      </div>
    </article>
  );
}
