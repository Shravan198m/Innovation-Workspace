import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

function normalizeMember(entry, index) {
  const formatNameFromValue = (value, fallback = "") => {
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
  };

  if (typeof entry === "string") {
    const value = entry.trim();
    if (!value) {
      return null;
    }

    return {
      name: formatNameFromValue(value, `Member ${index + 1}`),
      usn: "",
      email: value.includes("@") ? value : "",
      role: "STUDENT",
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    name: formatNameFromValue(entry.name || entry.email || entry.usn, `Member ${index + 1}`),
    usn: String(entry.usn || "").trim(),
    email: String(entry.email || "").trim(),
    role: String(entry.role || "STUDENT").trim().toUpperCase(),
  };
}

function normalizeProject(project) {
  const rawMembers = Array.isArray(project.teamMembers)
    ? project.teamMembers
    : Array.isArray(project.members)
      ? project.members
      : [];
  const teamMembers = rawMembers.map(normalizeMember).filter(Boolean);
  const teamLead = teamMembers.find((member) => member.role === "TEAM_LEAD");

  return {
    ...project,
    name: project.name || project.title || "Untitled Project",
    title: project.title || project.name || "Untitled Project",
    description: project.description || project.projectDescription || "",
    mentor: project.mentorName || project.mentor || project.mentorEmail || "",
    mentorName: project.mentorName || project.mentor || project.mentorEmail || "",
    mentorEmail: project.mentorEmail || project.mentor || "",
    teamLeadEmail: project.teamLeadEmail || teamLead?.email || "",
    dueDate: project.dueDate || project.deadline || null,
    deadline: project.deadline || project.dueDate || null,
    teamCount: Number(project.teamCount) || teamMembers.length || 1,
    teamMembers,
    members: Array.isArray(project.members)
      ? project.members.filter(Boolean)
      : teamMembers.map((member) => member.email || member.usn || member.name).filter(Boolean),
  };
}

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/projects");
      if (Array.isArray(response.data)) {
        setProjects(response.data.map(normalizeProject));
      } else {
        setProjects([]);
      }
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        setProjects([]);
        setError("Session expired or missing. Please log in again to load projects from the backend.");
        return;
      }

      setProjects([]);

      if (status) {
        const message = error?.response?.data?.message || "Unable to load projects from the backend.";
        setError(message);
      } else {
        setError("Backend unavailable. Start backend/database and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const addProject = async (payload) => {
    const index = projects.length;
    // Accept members as array of objects {name,email} or strings
    const memberList = Array.isArray(payload.members)
      ? payload.members
          .map((entry, i) => {
            if (!entry) return null;
            if (typeof entry === "string") {
              const val = String(entry).trim();
              return val ? { name: val.includes("@") ? val.split("@")[0] : `Member ${i+1}`, email: val.includes("@") ? val : "" } : null;
            }
            return { name: String(entry.name || entry.email || `Member ${i+1}`).trim(), email: String(entry.email || "").trim() };
          })
          .filter(Boolean)
      : [];

    try {
      const response = await api.post("/projects", {
        title: (payload.title || payload.name || "").trim(),
        name: (payload.name || payload.title || "").trim(),
        description: (payload.description || "").trim(),
        department: (payload.department || "").trim(),
        mentorName: (payload.mentorName || "").trim(),
        mentorEmail: (payload.mentorEmail || payload.mentor || "").trim(),
        mentor: (payload.mentor || payload.mentorEmail || "").trim(),
        teamLeadName: (payload.teamLeadName || "").trim(),
        teamLeadEmail: (payload.teamLeadEmail || "").trim(),
        teamMembers: memberList,
        deadline: payload.deadline || payload.dueDate || null,
        dueDate: payload.dueDate || payload.deadline || null,
        teamCount: Number(payload.teamCount) || memberList.length || 1,
        accent: payload.accent || getNextAccent(index),
      });

      const created = normalizeProject(response.data);
      setProjects((prev) => [created, ...prev]);
      return created;
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to create project.";
      throw new Error(message);
    }
  };

  const updateProject = async (projectId, payload) => {
    const memberList = Array.isArray(payload.members)
      ? payload.members
          .map((entry, i) => {
            if (!entry) return null;
            if (typeof entry === "string") {
              const val = String(entry).trim();
              return val ? { name: val.includes("@") ? val.split("@")[0] : `Member ${i+1}`, email: val.includes("@") ? val : "" } : null;
            }
            return { name: String(entry.name || entry.email || `Member ${i+1}`).trim(), email: String(entry.email || "").trim() };
          })
          .filter(Boolean)
      : [];

    try {
      const response = await api.put(`/projects/${projectId}`, {
        title: (payload.title || payload.name || "").trim(),
        name: (payload.name || payload.title || "").trim(),
        description: (payload.description || "").trim(),
        department: (payload.department || "").trim(),
        mentorName: (payload.mentorName || "").trim(),
        mentorEmail: (payload.mentorEmail || payload.mentor || "").trim(),
        mentor: (payload.mentor || payload.mentorEmail || "").trim(),
        teamLeadName: (payload.teamLeadName || "").trim(),
        teamLeadEmail: (payload.teamLeadEmail || "").trim(),
        teamMembers: memberList,
        deadline: payload.deadline || payload.dueDate || null,
        dueDate: payload.dueDate || payload.deadline || null,
        progress: payload.progress,
        teamCount: Number(payload.teamCount) || memberList.length || 1,
        accent: payload.accent || null,
      });

      const updated = normalizeProject(response.data);
      setProjects((prev) =>
        prev.map((project) =>
          String(project.id) === String(projectId) ? updated : project
        )
      );
      return updated;
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update project.";
      throw new Error(message);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects((prev) => prev.filter((project) => String(project.id) !== String(projectId)));
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to delete project.";
      throw new Error(message);
    }
  };

  const completeProject = async (projectId) => {
    try {
      const response = await api.patch(`/projects/${projectId}/complete`);
      const updated = normalizeProject(response.data);
      setProjects((prev) =>
        prev.map((project) =>
          String(project.id) === String(projectId) ? updated : project
        )
      );
      return updated;
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to mark project as completed.";
      throw new Error(message);
    }
  };

  const value = useMemo(
    () => ({
      projects,
      loading,
      error,
      setProjects,
      refreshProjects,
      addProject,
      updateProject,
      deleteProject,
      completeProject,
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
