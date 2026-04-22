import { Navigate, useParams } from "react-router-dom";
import ReportsTab from "./ReportsTab";
import ProjectWorkspaceShell from "../components/ProjectWorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectsContext";
import { normalizeRole } from "../utils/roles";

export default function Reports() {
  const { projectId } = useParams();
  const { getProjectById } = useProjects();
  const { user } = useAuth();
  const project = getProjectById(projectId);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ProjectWorkspaceShell project={project}>
      <ReportsTab
        projectId={project.id}
        currentUserRole={normalizeRole(user?.role)}
        projectAccent={project.accent}
      />
    </ProjectWorkspaceShell>
  );
}
