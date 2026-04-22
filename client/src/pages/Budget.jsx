import { Navigate, useParams } from "react-router-dom";
import BudgetTab from "./BudgetTab";
import ProjectWorkspaceShell from "../components/ProjectWorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectsContext";
import { normalizeRole, canViewBudget } from "../utils/roles";

export default function Budget() {
  const { projectId } = useParams();
  const { getProjectById } = useProjects();
  const { user } = useAuth();
  const project = getProjectById(projectId);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const normalizedRole = normalizeRole(user?.role);
  if (!canViewBudget(normalizedRole)) {
    return <Navigate to={`/projects/${project.id}/board`} replace />;
  }

  return (
    <ProjectWorkspaceShell project={project}>
      <BudgetTab
        projectId={project.id}
        currentUserRole={normalizedRole}
        projectAccent={project.accent}
      />
    </ProjectWorkspaceShell>
  );
}
