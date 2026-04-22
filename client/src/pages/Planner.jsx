import { Navigate, useParams } from "react-router-dom";
import ProjectWorkspaceShell from "../components/ProjectWorkspaceShell";
import { useProjects } from "../context/ProjectsContext";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/roles";
import PlannerTab from "./PlannerTab";

export default function Planner() {
  const { projectId } = useParams();
  const { getProjectById } = useProjects();
  const { user } = useAuth();
  const project = getProjectById(projectId);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ProjectWorkspaceShell project={project}>
      <PlannerTab
        projectId={project.id}
        currentUserRole={normalizeRole(user?.role)}
        currentUserName={user?.name || ""}
        currentUserEmail={user?.email || ""}
      />
    </ProjectWorkspaceShell>
  );
}
