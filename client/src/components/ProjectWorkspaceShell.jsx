import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import ActivityPanel from "./ActivityPanel";
import api from "../services/api";
import socket from "../socket";

export default function ProjectWorkspaceShell({ children, project }) {
  const teamMembers = Array.isArray(project.teamMembers) ? project.teamMembers : [];
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const tabs = [
    { label: "Board", to: `/projects/${project.id}/board` },
    { label: "Reports", to: `/projects/${project.id}/reports` },
    { label: "Budget", to: `/projects/${project.id}/budget` },
    { label: "Documents", to: `/projects/${project.id}/documents` },
  ];

  useEffect(() => {
    let mounted = true;

    const fetchActivity = async () => {
      try {
        const response = await api.get(`/activity/${project.id}`);
        if (mounted) {
          setActivity(Array.isArray(response.data) ? response.data : []);
        }
      } catch {
        if (mounted) {
          setActivity([]);
        }
      } finally {
        if (mounted) {
          setActivityLoading(false);
        }
      }
    };

    const handleActivityTrigger = (payload) => {
      if (String(payload?.projectId) !== String(project.id)) {
        return;
      }

      fetchActivity();
    };

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinProject", project.id);
    socket.on("taskUpdated", handleActivityTrigger);
    socket.on("reportAdded", handleActivityTrigger);
    socket.on("reportUpdated", handleActivityTrigger);

    fetchActivity();

    return () => {
      mounted = false;
      socket.emit("leaveProject", project.id);
      socket.off("taskUpdated", handleActivityTrigger);
      socket.off("reportAdded", handleActivityTrigger);
      socket.off("reportUpdated", handleActivityTrigger);
    };
  }, [project.id]);

  return (
    <section className="h-full overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <header className={`overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-r ${project.accent} text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]`}>
          <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <NavLink to="/projects" className="text-sm font-medium text-white/85 transition hover:text-white">
                  ← Back to Projects
                </NavLink>

                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                  Mentor Controlled Workspace
                </div>

                <div>
                  <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{project.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/90">
                    <span className="rounded-full bg-white/15 px-3 py-1">Mentor: {project.mentor}</span>
                    <span className="rounded-full bg-white/15 px-3 py-1">Department: {project.department}</span>
                    <span className="rounded-full bg-white/15 px-3 py-1">Team: {teamMembers.length || project.teamCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="min-w-[240px] rounded-[24px] border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/75">Project Completion</p>
                    <p className="mt-1 text-4xl font-semibold leading-none">{project.progress}%</p>
                  </div>
                  <div className="text-right text-xs text-white/75">
                    <p>Live workspace</p>
                    <p>Standardized for company use</p>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-white/20">
                  <div className="h-2 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.45)]" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur-md">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/75">Team Members</p>
                <p className="mt-1 text-sm text-white/80">Fast access to the project group and mentor overview.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <article key={`${member.usn}-${member.name}`} className="flex items-center gap-3 rounded-full border border-white/20 bg-white/15 px-3 py-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-semibold text-white">
                        {member.avatar || member.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="pr-1">
                        <p className="text-sm font-medium leading-tight text-white">{member.name}</p>
                        <p className="text-xs text-white/80">{member.usn || "USN pending"}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-white/80">Team members will appear here after onboarding.</p>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="rounded-[24px] border border-slate-200 bg-white/90 px-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md sm:px-6">
          <nav className="flex flex-wrap gap-2 py-3" aria-label="Project sections">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${project.accent} text-white shadow-lg`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
          </nav>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md sm:p-6">
            {children}
          </div>

          <ActivityPanel activity={activity} loading={activityLoading} />
        </div>
      </div>
    </section>
  );
}
