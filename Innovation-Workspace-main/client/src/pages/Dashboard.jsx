import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { MinimalFooter } from "../components/Footer";
import ProjectCard from "../components/ProjectCard";
import SectionWrapper from "../components/SectionWrapper";
import StatsCard from "../components/StatsCard";
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
    description: "",
    department: "",
    mentorName: "",
    mentorEmail: "",
    teamLeadName: "",
    teamLeadEmail: "",
    members: [{ name: "", email: "" }],
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
          (String(project.name || project.title || "").toLowerCase().includes(search.toLowerCase())) ||
          (String(project.mentorName || project.mentor || "").toLowerCase().includes(search.toLowerCase())) ||
          (String(project.department || "").toLowerCase().includes(search.toLowerCase()));

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

  const handleMemberChange = (index, field, value) => {
    setNewProject((prev) => {
      const members = Array.isArray(prev.members) ? [...prev.members] : [];
      members[index] = { ...(members[index] || { name: "", email: "" }), [field]: value };
      return { ...prev, members };
    });
  };

  const addMemberField = () => {
    setNewProject((prev) => ({ ...prev, members: [...(prev.members || []), { name: "", email: "" }] }));
  };

  const createProject = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!canCreateProject) {
      setFormError("Only manager can create projects.");
      return;
    }

    if (!newProject.title.trim() || !newProject.description.trim() || !newProject.department.trim() || !newProject.mentorEmail.trim() || !newProject.mentorName.trim()) {
      setFormError("Project title, description, department, and mentor name/email are required.");
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
      const normalizedMembers = (newProject.members || []).map((m, i) => {
        if (!m) return null;
        if (typeof m === "string") {
          const email = String(m).trim();
          return { name: email.includes("@") ? email.split("@")[0] : `Member ${i+1}`, email };
        }
        return { name: String(m.name || (m.email || `Member ${i+1}`)).trim(), email: String(m.email || "").trim() };
      }).filter(Boolean);

      const payload = {
        ...newProject,
        name: newProject.title,
        mentorName: newProject.mentorName,
        mentor: newProject.mentorEmail,
        mentorEmail: newProject.mentorEmail,
        teamLeadName: newProject.teamLeadName,
        teamLeadEmail: newProject.teamLeadEmail,
        dueDate: newProject.deadline,
        teamMembers: normalizedMembers,
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
        description: "",
        department: "",
        mentorName: "",
        mentorEmail: "",
        teamLeadName: "",
        teamLeadEmail: "",
        members: [{ name: "", email: "" }],
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
      ? project.members.map((m) => (typeof m === "string" ? { name: m, email: m.includes("@") ? m : "" } : { name: m.name || m.email || `Member`, email: m.email || "" }))
      : Array.isArray(project.teamMembers)
        ? project.teamMembers.map((member) => ({ name: member.name || member.email || `Member`, email: member.email || "" }))
        : [{ name: "", email: "" }];

    setNewProject({
      title: project.title || project.name || "",
      description: project.description || "",
      department: project.department || "",
      mentorName: project.mentorName || "",
      mentorEmail: project.mentorEmail || project.mentor || "",
      teamLeadName: project.teamLeadName || "",
      teamLeadEmail: project.teamLeadEmail || "",
      members: members.length ? members : [{ name: "", email: "" }],
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
    <section className="app-page h-full overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
      <SectionWrapper className="space-y-4 py-0">
        <div className="flex flex-col gap-4 pb-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Innovation Workspace</p>
            <h1 className="font-sans text-2xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
              Project Dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
              Manage and track all your projects in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={!canCreateProject}
            className="glass-button-primary inline-flex h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 lg:shrink-0"
            title={canCreateProject ? "Create a new project" : "Only manager can create projects"}
          >
            + Create Project
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total Projects" value={metrics.total} accentClass="text-slate-900" className="rounded-xl p-4" />
          <StatsCard label="Active" value={metrics.active} accentClass="text-cyan-600" className="rounded-xl p-4" />
          <StatsCard label="Completed" value={metrics.completed} accentClass="text-emerald-600" className="rounded-xl p-4" />
          <StatsCard label="Delayed" value={metrics.delayed} accentClass="text-rose-600" className="rounded-xl p-4" />
        </div>

        <div className="app-glass rounded-xl px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
              <div className="relative w-full lg:basis-[46%] lg:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search projects, mentor, or department"
                  className="glass-input h-11 w-full rounded-[10px] py-2 pl-10 pr-3 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-1 lg:flex-nowrap">
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
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
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

            <div className="flex items-center justify-between gap-3 lg:min-w-max lg:justify-end">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{filteredProjects.length}</span> of {projects.length}
              </span>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                disabled={!hasActiveProjectFilters}
                className="glass-button-secondary h-11 rounded-[10px] px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
          className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
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
          <div className="glass-card rounded-3xl border-dashed p-8 text-center text-slate-500">
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
              className="glass-panel w-full max-w-lg rounded-[24px] p-5"
            >
              <h2 className="text-lg font-semibold text-slate-900">{editingProject ? "Edit Project" : "Create Project"}</h2>
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
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={handleFieldChange}
                  placeholder="Project description"
                  rows={4}
                  className="glass-input min-h-[112px] rounded-xl px-4 py-3 text-sm leading-6"
                />
                <input
                  name="department"
                  value={newProject.department}
                  onChange={handleFieldChange}
                  placeholder="Department"
                  className="glass-input rounded-xl px-4 py-2 text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    name="mentorName"
                    value={newProject.mentorName}
                    onChange={handleFieldChange}
                    placeholder="Mentor Name"
                    className="glass-input rounded-xl px-4 py-2 text-sm"
                  />
                  <input
                    name="mentorEmail"
                    value={newProject.mentorEmail}
                    onChange={handleFieldChange}
                    placeholder="Mentor Email"
                    className="glass-input rounded-xl px-4 py-2 text-sm"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    name="teamLeadName"
                    value={newProject.teamLeadName}
                    onChange={handleFieldChange}
                    placeholder="Team Lead Name"
                    className="glass-input rounded-xl px-4 py-2 text-sm"
                  />
                  <input
                    name="teamLeadEmail"
                    value={newProject.teamLeadEmail}
                    onChange={handleFieldChange}
                    placeholder="Team Lead Email"
                    className="glass-input rounded-xl px-4 py-2 text-sm"
                  />
                </div>

                <div className="rounded-xl border border-white/50 bg-white/50 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Team Members</p>
                  <div className="mt-2 space-y-2">
                    {newProject.members.map((member, index) => (
                      <div key={`member-${index}`} className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={member?.name || ""}
                          onChange={(event) => handleMemberChange(index, "name", event.target.value)}
                          placeholder={`Member ${index + 1} Name`}
                          className="glass-input w-full rounded-xl px-4 py-2 text-sm"
                        />
                        <input
                          value={member?.email || ""}
                          onChange={(event) => handleMemberChange(index, "email", event.target.value)}
                          placeholder={`Member ${index + 1} Email`}
                          className="glass-input w-full rounded-xl px-4 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newProject.members
                      .map((member) => (member?.name || "").trim())
                      .filter(Boolean)
                      .map((memberName, index) => (
                        <span
                          key={`${memberName}-${index}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                            {memberName.charAt(0).toUpperCase()}
                          </span>
                          {memberName}
                        </span>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMemberField}
                    disabled={newProject.members.length >= 10}
                    className="mt-2 text-sm font-medium text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:text-slate-400"
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
      </SectionWrapper>
      <MinimalFooter />
    </section>
  );
}
