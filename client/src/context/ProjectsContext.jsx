import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialProjects } from "../data/projects";
import api from "../services/api";

const accentOptions = [
  "from-emerald-600 to-teal-500",
  "from-blue-700 to-sky-500",
  "from-violet-700 to-fuchsia-500",
  "from-cyan-700 to-teal-500",
  "from-pink-700 to-rose-500",
  "from-orange-600 to-amber-500",
];

const ProjectsContext = createContext(null);

function getNextAccent(index) {
  return accentOptions[index % accentOptions.length];
}

function normalizeProject(project) {
  return {
    ...project,
    teamMembers: Array.isArray(project.teamMembers) ? project.teamMembers : [],
  };
}

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState(initialProjects);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/projects");
      if (Array.isArray(response.data) && response.data.length > 0) {
        setProjects(response.data.map(normalizeProject));
      } else {
        setProjects(initialProjects.map(normalizeProject));
      }
    } catch {
      setProjects(initialProjects.map(normalizeProject));
      setError("Using offline demo data. Start backend to sync real data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const addProject = async (payload) => {
    const index = projects.length;
    const response = await api.post("/projects", {
      name: payload.name.trim(),
      mentor: payload.mentor.trim(),
      department: payload.department.trim(),
      teamCount: Number(payload.teamCount) || 1,
      dueDate: payload.dueDate,
      accent: getNextAccent(index),
      teamMembers: Array.isArray(payload.teamMembers) ? payload.teamMembers : [],
    });

    const created = normalizeProject(response.data);
    setProjects((prev) => [created, ...prev]);
    return created;
  };

  const value = useMemo(
    () => ({
      projects,
      loading,
      error,
      setProjects,
      refreshProjects,
      addProject,
      getProjectById: (projectId) =>
        projects.find((project) => String(project.id) === String(projectId)) || null,
    }),
    [projects, loading, error]
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used inside ProjectsProvider");
  }

  return context;
}
