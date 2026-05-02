import { Navigate, useParams } from "react-router-dom";
import ReportsTab from "./ReportsTab";
import ProjectWorkspaceShell from "../components/ProjectWorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectsContext";
import { resolveProjectRole } from "../utils/roles";

export default function Reports() {
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
      <ReportsTab
        projectId={project.id}
        currentUserRole={projectRole}
        currentUserName={user?.name || ""}
        currentUserEmail={user?.email || ""}
        projectAccent={project.accent}
      />
    </ProjectWorkspaceShell>
  );
}
