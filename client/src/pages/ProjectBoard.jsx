import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Board from "../components/Board";
import { useProjects } from "../context/ProjectsContext";
import ProjectWorkspaceShell from "../components/ProjectWorkspaceShell";
import api from "../services/api";

export default function ProjectBoard({ currentUserRole, currentUserName = "", currentUserEmail = "" }) {
  const { projectId } = useParams();
  const { getProjectById } = useProjects();
  const [project, setProject] = useState(() => getProjectById(projectId));
  const [loading, setLoading] = useState(!project);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const existingProject = getProjectById(projectId);
    if (existingProject) {
      setProject(existingProject);
      setLoading(false);
      setNotFound(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setNotFound(false);

    api
      .get(`/projects/${projectId}`)
      .then((response) => {
        if (!mounted) {
          return;
        }

        setProject(response.data || null);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        if (error?.response?.status === 404) {
          setNotFound(true);
        }
        setProject(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [projectId, getProjectById]);

  if (loading) {
    return (
      <section className="app-page flex min-h-[60vh] items-center justify-center text-slate-600">
        Loading project workspace...
      </section>
    );
  }

  if (!project || notFound) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ProjectWorkspaceShell project={project}>
      <Board
        currentUserRole={currentUserRole}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        projectId={project.id}
        projectAccent={project.accent}
      />
    </ProjectWorkspaceShell>
  );
}
