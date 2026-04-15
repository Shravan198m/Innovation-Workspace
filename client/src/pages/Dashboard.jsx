import { useMemo, useState } from "react";
import ProjectCard from "../components/ProjectCard";
import { useProjects } from "../context/ProjectsContext";

export default function Dashboard() {
  const { projects, addProject, loading, error } = useProjects();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [newProject, setNewProject] = useState({
    name: "",
    mentor: "",
    department: "",
    teamCount: "4",
    dueDate: "",
  });

  const metrics = useMemo(() => {
    const today = new Date();
    const delayedCount = projects.filter(
      (project) =>
        project.progress < 100 &&
        project.dueDate &&
        new Date(project.dueDate) < today
    ).length;

    const completedCount = projects.filter((project) => project.progress >= 100).length;
    const activeCount = projects.length - completedCount;

    return {
      total: projects.length,
      active: activeCount,
      completed: completedCount,
      delayed: delayedCount,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const today = new Date();

    return projects
      .filter((project) => {
        const matchesSearch =
          project.name.toLowerCase().includes(search.toLowerCase()) ||
          project.mentor.toLowerCase().includes(search.toLowerCase()) ||
          project.department.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) {
          return false;
        }

        if (filter === "active") {
          return project.progress < 100;
        }

        if (filter === "completed") {
          return project.progress >= 100;
        }

        if (filter === "delayed") {
          return (
            project.progress < 100 &&
            project.dueDate &&
            new Date(project.dueDate) < today
          );
        }

        return true;
      })
      .sort((a, b) => b.progress - a.progress);
  }, [projects, search, filter]);

  const createProject = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!newProject.name.trim() || !newProject.mentor.trim() || !newProject.department.trim()) {
      setFormError("Please fill project name, mentor, and department.");
      return;
    }

    if (!newProject.dueDate) {
      setFormError("Please select a due date.");
      return;
    }

    try {
      await addProject(newProject);
      setIsCreateOpen(false);
      setNewProject({
        name: "",
        mentor: "",
        department: "",
        teamCount: "4",
        dueDate: "",
      });
    } catch {
      setFormError("Failed to create project. Check backend and database connection.");
    }
  };

  return (
    <section className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="bg-[linear-gradient(135deg,_#0f172a_0%,_#0f766e_100%)] px-6 py-6 text-white sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/80">Innovation Workspace</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Project Control Center</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/85 sm:text-base">
                  Mentor-controlled project portfolio with clean navigation, live progress tracking,
                  and enterprise-style workspace management.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-950/20 transition hover:translate-y-[-1px] hover:bg-cyan-50"
              >
                + Create Project
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Projects</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.total}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-600">{metrics.active}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Completed</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.completed}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Delayed</p>
              <p className="mt-2 text-3xl font-semibold text-rose-600">{metrics.delayed}</p>
            </article>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects, mentor, or department"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none shadow-sm transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />

          {["all", "active", "completed", "delayed"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm capitalize transition-colors ${
                filter === item
                  ? "bg-slate-900 text-white shadow-lg"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Loading projects from server...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
            No projects match your current search/filter.
          </div>
        )}

        {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <form
            onSubmit={createProject}
            className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold text-slate-900">Create Project</h2>
            <p className="text-sm text-slate-500 mt-1">
              Add a new mentor-controlled project workspace.
            </p>

            <div className="mt-4 grid gap-3">
              <input
                value={newProject.name}
                onChange={(event) =>
                  setNewProject((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Project name"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={newProject.mentor}
                onChange={(event) =>
                  setNewProject((prev) => ({ ...prev, mentor: event.target.value }))
                }
                placeholder="Mentor name"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={newProject.department}
                onChange={(event) =>
                  setNewProject((prev) => ({ ...prev, department: event.target.value }))
                }
                placeholder="Department"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={newProject.teamCount}
                  onChange={(event) =>
                    setNewProject((prev) => ({ ...prev, teamCount: event.target.value }))
                  }
                  placeholder="Team count"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="date"
                  value={newProject.dueDate}
                  onChange={(event) =>
                    setNewProject((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {formError && (
              <p className="mt-3 rounded-md border border-orange/40 bg-orange/10 px-3 py-2 text-sm text-orange-700">
                {formError}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </section>
  );
}
