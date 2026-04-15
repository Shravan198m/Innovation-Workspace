import { Navigate, useParams } from "react-router-dom";
import Board from "../components/Board";
import { useProjects } from "../context/ProjectsContext";
import ProjectWorkspaceShell from "../components/ProjectWorkspaceShell";

export default function ProjectBoard({ currentUserRole }) {
  const { projectId } = useParams();
  const { getProjectById } = useProjects();
  const project = getProjectById(projectId);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ProjectWorkspaceShell project={project}>
      <Board
        currentUserRole={currentUserRole}
        projectId={project.id}
        projectAccent={project.accent}
      />
    </ProjectWorkspaceShell>
  );
}
