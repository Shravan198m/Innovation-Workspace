import { Navigate, useParams } from "react-router-dom";
import DocumentsTab from "./DocumentsTab";
import ProjectWorkspaceShell from "../components/ProjectWorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectsContext";
import { resolveProjectRole } from "../utils/roles";

export default function Documents() {
  const { projectId } = useParams();
  const { getProjectById } = useProjects();
  const { user } = useAuth();
  const project = getProjectById(projectId);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const projectRole = resolveProjectRole(project, user || {});

  return (
    <ProjectWorkspaceShell project={project}>
      <DocumentsTab
        projectId={project.id}
        currentUserRole={projectRole}
        projectAccent={project.accent}
      />
    </ProjectWorkspaceShell>
  );
}
