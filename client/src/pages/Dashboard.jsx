import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ProjectCard from "../components/ProjectCard";
import SkeletonCard from "../components/SkeletonCard";
import { useProjects } from "../context/ProjectsContext";
import { useAuth } from "../context/AuthContext";
import { isManagerRole } from "../utils/roles";

export default function Dashboard() {
  const { projects, addProject, updateProject, deleteProject, completeProject, loading, error } = useProjects();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [formError, setFormError] = useState("");
  const [newProject, setNewProject] = useState({
    title: "",
    department: "",
    mentorEmail: "",
    teamLeadEmail: "",
    members: [""],
    deadline: "",
  });
  const canCreateProject = isManagerRole(user?.role);

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

  const hasActiveProjectFilters = Boolean(search.trim()) || filter !== "all";
  const projectSkeletons = useMemo(() => Array.from({ length: 8 }, (_, index) => index), []);
  const projectGridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setNewProject((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (index, value) => {
    setNewProject((prev) => {
      const members = [...prev.members];
      members[index] = value;
      return { ...prev, members };
    });
  };

  const addMemberField = () => {
    setNewProject((prev) => ({ ...prev, members: [...prev.members, ""] }));
  };

  const createProject = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!canCreateProject) {
      setFormError("Only manager can create projects.");
      return;
    }

    if (!newProject.title.trim() || !newProject.department.trim() || !newProject.mentorEmail.trim()) {
      setFormError("Project title, department, and mentor email are required.");
      return;
    }

    if (!newProject.mentorEmail.includes("@")) {
      setFormError("Invalid mentor email.");
      return;
    }

    if (newProject.teamLeadEmail.trim() && !newProject.teamLeadEmail.includes("@")) {
      setFormError("Invalid team lead email.");
      return;
    }

    if (!newProject.deadline) {
      setFormError("Please select a deadline.");
      return;
    }

    try {
      const normalizedMembers = newProject.members.map((entry) => entry.trim()).filter(Boolean);

      const payload = {
        ...newProject,
        name: newProject.title,
        mentor: newProject.mentorEmail,
        dueDate: newProject.deadline,
        members: normalizedMembers,
        teamCount: normalizedMembers.length || 1,
      };

      if (editingProject) {
        await updateProject(editingProject.id, payload);
      } else {
        await addProject(payload);
      }

      setIsCreateOpen(false);
      setEditingProject(null);
      setNewProject({
        title: "",
        department: "",
        mentorEmail: "",
        teamLeadEmail: "",
        members: [""],
        deadline: "",
      });
    } catch (errorMessage) {
      setFormError(errorMessage?.message || "Failed to create project. Check backend and database connection.");
    }
  };

  const openEditProject = (project) => {
    setEditingProject(project);
    setFormError("");
    const members = Array.isArray(project.members) && project.members.length
      ? project.members
      : Array.isArray(project.teamMembers)
        ? project.teamMembers.map((member) => member.email || member.usn || member.name).filter(Boolean)
        : [""];

    setNewProject({
      title: project.title || project.name || "",
      department: project.department || "",
      mentorEmail: project.mentorEmail || project.mentor || "",
      teamLeadEmail: project.teamLeadEmail || "",
      members: members.length ? members : [""],
      deadline: project.deadline || project.dueDate || "",
    });
    setIsCreateOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!deletingProject) {
      return;
    }

    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (errorMessage) {
      setFormError(errorMessage?.message || "Failed to delete project.");
    }
  };

  const markProjectCompleted = async (project) => {
    try {
      await completeProject(project.id);
    } catch (errorMessage) {
      setFormError(errorMessage?.message || "Failed to mark project as completed.");
    }
  };

  return (
    <section className="app-page h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 p-8 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 font-sans text-sm font-medium uppercase tracking-wide text-white">Innovation Workspace</p>
              <h1 className="font-sans text-[40px] font-extrabold leading-tight tracking-[-0.02em] text-white lg:text-[52px]">
                Project Control Center
              </h1>
              <p className="mt-3 max-w-2xl font-sans text-lg text-white">
                Manager-controlled project portfolio with clean navigation, live progress tracking, and enterprise-style workspace management.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              disabled={!canCreateProject}
              className="glass-button-primary rounded-xl px-5 py-2 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
              title={canCreateProject ? "Create a new project" : "Only manager can create projects"}
            >
              + Create Project
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="glass-card app-elevate rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Projects</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.total}</p>
          </article>
          <article className="glass-card app-elevate rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-600">{metrics.active}</p>
          </article>
          <article className="glass-card app-elevate rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.completed}</p>
          </article>
          <article className="glass-card app-elevate rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Delayed</p>
            <p className="mt-2 text-3xl font-semibold text-rose-600">{metrics.delayed}</p>
          </article>
        </div>

        <div className="app-glass rounded-2xl p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects, mentor, or department"
                className="glass-input w-full rounded-xl px-4 py-2 lg:max-w-xl"
              />

              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "completed", label: "Completed" },
                  { value: "delayed", label: "Delayed" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-all duration-300 ${
                      filter === item.value
                        ? "glass-button-primary text-white"
                        : "glass-button-secondary text-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <span className="rounded-full border border-white/30 bg-white/60 px-3 py-1 text-xs">
                Showing <span className="font-semibold text-slate-700">{filteredProjects.length}</span> of {projects.length}
              </span>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                disabled={!hasActiveProjectFilters}
                className="glass-button-secondary rounded-xl px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="glass-card rounded-2xl px-4 py-3 text-sm text-slate-600">
            Loading projects from server...
          </div>
        )}

        {error && (
          <div className="glass-card rounded-2xl px-4 py-3 text-sm text-orange-800">
            {error}
          </div>
        )}

        <motion.div
          variants={projectGridVariants}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {loading
            ? projectSkeletons.map((item) => <SkeletonCard key={item} index={item} />)
            : filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  canManageProject={canCreateProject}
                  currentUserEmail={user?.email || ""}
                  currentUserName={user?.name || ""}
                  currentUserRole={user?.role || "student"}
                  onEdit={openEditProject}
                  onComplete={markProjectCompleted}
                  onDelete={(targetProject) => setDeletingProject(targetProject)}
                />
              ))}
        </motion.div>

        {!loading && filteredProjects.length === 0 && (
          <div className="glass-card rounded-3xl border-dashed p-10 text-center text-slate-500">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 text-2xl">
              ✦
            </div>
            <p className="text-base font-semibold text-slate-700">No projects yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Start by creating your first project workspace.
            </p>
          </div>
        )}

        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <form
              onSubmit={createProject}
              className="glass-panel w-full max-w-lg rounded-[28px] p-6"
            >
              <h2 className="text-xl font-semibold text-slate-900">{editingProject ? "Edit Project" : "Create Project"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingProject ? "Update project ownership and team assignment." : "Add a new manager-controlled project workspace."}
              </p>

              <div className="mt-4 grid gap-3">
                <input
                  name="title"
                  value={newProject.title}
                  onChange={handleFieldChange}
                  placeholder="Project title"
                  className="glass-input rounded-xl px-4 py-2 text-sm"
                />
                <input
                  name="department"
                  value={newProject.department}
                  onChange={handleFieldChange}
                  placeholder="Department"
                  className="glass-input rounded-xl px-4 py-2 text-sm"
                />
                <input
                  name="mentorEmail"
                  value={newProject.mentorEmail}
                  onChange={handleFieldChange}
                  placeholder="Mentor Email"
                  className="glass-input rounded-xl px-4 py-2 text-sm"
                />
                <input
                  name="teamLeadEmail"
                  value={newProject.teamLeadEmail}
                  onChange={handleFieldChange}
                  placeholder="Team Lead Email"
                  className="glass-input rounded-xl px-4 py-2 text-sm"
                />

                <div className="rounded-xl border border-white/50 bg-white/50 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Team Members</p>
                  <div className="mt-2 space-y-2">
                    {newProject.members.map((member, index) => (
                      <input
                        key={`member-${index}`}
                        value={member}
                        onChange={(event) => handleMemberChange(index, event.target.value)}
                        placeholder={`Member ${index + 1} Email`}
                        className="glass-input w-full rounded-xl px-4 py-2 text-sm"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMemberField}
                    className="mt-2 text-sm font-medium text-blue-700 transition hover:text-blue-800"
                  >
                    + Add Member
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    name="deadline"
                    value={newProject.deadline}
                    onChange={handleFieldChange}
                    className="glass-input rounded-xl px-4 py-2 text-sm"
                  />
                  <div className="glass-input flex items-center rounded-xl px-3 py-2 text-sm text-slate-600">
                    Member Count: {newProject.members.map((entry) => entry.trim()).filter(Boolean).length}
                  </div>
                </div>
              </div>

              {formError && (
                <p className="mt-3 rounded-md border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm text-orange-700 backdrop-blur-sm">
                  {formError}
                </p>
              )}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingProject(null);
                  }}
                  className="glass-button-secondary rounded-xl px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary rounded-xl px-4 py-2 text-sm font-medium"
                >
                  {editingProject ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
      )}

      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-[24px] p-6">
            <h3 className="text-lg font-semibold text-slate-900">Delete project?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove <span className="font-semibold">{deletingProject.title || deletingProject.name}</span> and related workspace data.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="glass-button-secondary rounded-xl px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
