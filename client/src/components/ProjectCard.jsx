import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import StatusBadge from "./ui/StatusBadge";
import ProgressBar from "./ui/ProgressBar";
import AvatarGroup from "./ui/AvatarGroup";
import { getRoleLabel, normalizeRole } from "../utils/roles";

function getProjectMembers(project) {
  if (Array.isArray(project.members) && project.members.length) {
    return project.members.map((member, index) => {
      if (member && typeof member === "object") {
        return member;
      }

      return {
        name: String(member || `Member ${index + 1}`),
        role: "student",
      };
    });
  }

  if (Array.isArray(project.teamMembers) && project.teamMembers.length) {
    return project.teamMembers;
  }

  const fallbackCount = Number(project.teamCount || project.team) || 0;
  return Array.from({ length: Math.min(3, fallbackCount) }, (_, index) => ({
    name: `Member ${index + 1}`,
    role: "student",
  }));
}

function getProjectStatus(project) {
  const progress = Number(project.progress) || 0;
  if (progress >= 100) {
    return "completed";
  }

  if (project.dueDate && new Date(project.dueDate) < new Date()) {
    return "delayed";
  }

  return "active";
}

export default function ProjectCard({
  project,
  index = 0,
  canManageProject = false,
  onEdit = null,
  onComplete = null,
  onDelete = null,
  currentUserEmail = "",
  currentUserName = "",
  currentUserRole = "student",
}) {
  const members = getProjectMembers(project);
  const status = getProjectStatus(project);
  const normalizedUserRole = normalizeRole(currentUserRole);
  const currentEmail = String(currentUserEmail || "").trim().toLowerCase();
  const currentName = String(currentUserName || "").trim().toLowerCase();

  const roleInProject = (() => {
    const teamMembers = Array.isArray(project.teamMembers) ? project.teamMembers : [];
    const mentorEmail = String(project.mentorEmail || project.mentor || "").trim().toLowerCase();
    const teamLeadEmail = String(project.teamLeadEmail || "").trim().toLowerCase();

    if (normalizedUserRole === "admin") {
      return "Manager";
    }

    if ((currentEmail && currentEmail === mentorEmail) || (currentName && currentName === mentorEmail)) {
      return "Mentor";
    }

    if (currentEmail && currentEmail === teamLeadEmail) {
      return "Team Lead";
    }

    const matchedTeamMember = teamMembers.find((member) => {
      const memberEmail = String(member?.email || "").trim().toLowerCase();
      const memberName = String(member?.name || "").trim().toLowerCase();
      return (currentEmail && currentEmail === memberEmail) || (currentName && currentName === memberName);
    });

    if (matchedTeamMember) {
      return getRoleLabel(matchedTeamMember.role || "student");
    }

    return getRoleLabel(normalizedUserRole);
  })();

  const handleEnterWorkspace = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const scrollContainers = document.querySelectorAll(".app-page, main");
    scrollContainers.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      }
    });
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="h-full"
    >
      <Card className="group flex h-full flex-col p-5 transition-all duration-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
        <div className="mb-3 h-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

        <h3 className="heading-font text-lg font-semibold text-slate-900">
          {project.title || project.name}
        </h3>

        {canManageProject && (
          <div className="mt-3 flex justify-end">
            <details className="relative">
              <summary className="glass-button-secondary list-none rounded-lg px-2 py-1.5 text-slate-700">
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="glass-panel absolute right-0 z-20 mt-2 flex w-40 flex-col gap-1 rounded-xl p-2">
                <button
                  type="button"
                  onClick={() => onEdit?.(project)}
                  className="glass-button-secondary rounded-lg px-3 py-1.5 text-left text-xs font-semibold"
                >
                  Edit Project
                </button>
                <button
                  type="button"
                  onClick={() => onComplete?.(project)}
                  disabled={Number(project.progress) >= 100}
                  className="glass-button-secondary rounded-lg px-3 py-1.5 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Number(project.progress) >= 100 ? "Completed" : "Mark Completed"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(project)}
                  className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-left text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Delete Project
                </button>
              </div>
            </details>
          </div>
        )}

        <p className="mt-1 text-sm text-slate-500">{project.department}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <Badge>{members.length} Members</Badge>
          <Badge className="bg-slate-900/5 text-slate-700">Your role: {roleInProject}</Badge>
        </div>

        <AvatarGroup members={members} />

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
        </div>

        <div className="mt-auto pt-5">
          <Link
            to={`/projects/${project.id}/board`}
            onClick={handleEnterWorkspace}
            className="inline-flex items-center text-sm font-medium text-blue-600 transition hover:translate-x-0.5 hover:underline"
          >
            Enter Workflow -&gt;
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
