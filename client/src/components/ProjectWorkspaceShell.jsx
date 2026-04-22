import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import ActivityPanel from "./ActivityPanel";
import ChatPanel from "./ChatPanel";
import api from "../services/api";
import socket from "../socket";

export default function ProjectWorkspaceShell({ children, project }) {
  const location = useLocation();
  const containerId = `project-workspace-scroll-${project.id}`;
  const teamMembers = Array.isArray(project.teamMembers) ? project.teamMembers : [];
  const teamLeadMember = teamMembers.find((member) => String(member?.role || "").trim().toUpperCase() === "TEAM_LEAD");
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [activityStateReady, setActivityStateReady] = useState(false);
  const [chatStateReady, setChatStateReady] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(Number(project.progress) || 0);
  const activityStateKey = `project:${project.id}:activityOpen`;
  const chatStateKey = `project:${project.id}:chatOpen`;
  const tabs = [
    { label: "Board", to: `/projects/${project.id}/board` },
    { label: "Reports", to: `/projects/${project.id}/reports` },
    { label: "Budget", to: `/projects/${project.id}/budget` },
    { label: "Documents", to: `/projects/${project.id}/documents` },
    { label: "Planner", to: `/projects/${project.id}/planner` },
  ];

  useEffect(() => {
    let mounted = true;

    const fetchCompletion = async () => {
      try {
        const response = await api.get(`/tasks/${project.id}`);
        const tasks = Array.isArray(response.data) ? response.data : [];

        if (!mounted) {
          return;
        }

        if (!tasks.length) {
          setCompletionPercent(Number(project.progress) || 0);
          return;
        }

        const completedCount = tasks.filter((task) => String(task.status || "").toLowerCase() === "completed").length;
        const ratio = (completedCount / tasks.length) * 100;
        setCompletionPercent(Math.max(0, Math.min(100, Math.round(ratio))));
      } catch {
        if (mounted) {
          setCompletionPercent(Number(project.progress) || 0);
        }
      }
    };

    fetchCompletion();

    const handleTaskUpdate = (payload) => {
      if (String(payload?.projectId) !== String(project.id)) {
        return;
      }

      fetchCompletion();
    };

    socket.on("taskUpdated", handleTaskUpdate);

    return () => {
      mounted = false;
      socket.off("taskUpdated", handleTaskUpdate);
    };
  }, [project.id, project.progress]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const container = document.getElementById(containerId);
      if (container) {
        container.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, containerId]);

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

  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(activityStateKey);
      if (savedState === "false") {
        setActivityOpen(false);
        setActivityStateReady(true);
        return;
      }

      if (savedState === "true") {
        setActivityOpen(true);
        setActivityStateReady(true);
        return;
      }

      setActivityOpen(true);
      setActivityStateReady(true);
    } catch {
      setActivityOpen(true);
      setActivityStateReady(true);
    }
  }, [activityStateKey]);

  useEffect(() => {
    if (!activityStateReady) {
      return;
    }

    try {
      window.localStorage.setItem(activityStateKey, String(activityOpen));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [activityOpen, activityStateKey, activityStateReady]);

  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(chatStateKey);
      if (savedState === "true") {
        setChatOpen(true);
        setChatStateReady(true);
        return;
      }

      setChatOpen(false);
      setChatStateReady(true);
    } catch {
      setChatOpen(false);
      setChatStateReady(true);
    }
  }, [chatStateKey]);

  useEffect(() => {
    if (!chatStateReady) {
      return;
    }

    try {
      window.localStorage.setItem(chatStateKey, String(chatOpen));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [chatOpen, chatStateKey, chatStateReady]);

  const handleActivityToggle = () => {
    setActivityOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(activityStateKey, String(next));
      } catch {
        // Ignore localStorage write failures.
      }
      return next;
    });
  };

  const handleChatToggle = () => {
    setChatOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(chatStateKey, String(next));
      } catch {
        // Ignore localStorage write failures.
      }
      return next;
    });
  };

  const hasRightPanels = activityOpen || chatOpen;
  const bothPanelsOpen = activityOpen && chatOpen;
  const rightPanelItemClass = bothPanelsOpen
    ? "lg:h-[calc((100vh-9rem-1rem)/2)]"
    : "lg:h-[calc(100vh-9rem)]";

  return (
    <section id={containerId} className="app-page h-full overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="glass-panel overflow-hidden rounded-[30px] font-sans text-slate-900">
          <div className="bg-gradient-to-r from-blue-500/20 via-indigo-500/18 to-cyan-500/20 px-6 py-6 sm:px-8 sm:py-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3.5">
                  <NavLink to="/projects" className="text-sm font-medium text-slate-500 transition hover:text-slate-900">
                    ← Back to Projects
                  </NavLink>
                </div>

                <div>
                  <h1 className="text-4xl font-black tracking-tight text-black lg:text-5xl">{project.name}</h1>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm text-slate-700">
                    <span className="badge">Mentor: {project.mentor}</span>
                    <span className="badge">Team Lead: {teamLeadMember?.name || project.teamLeadEmail || "Not assigned"}</span>
                    <span className="badge">Department: {project.department}</span>
                    <span className="badge">Team: {teamMembers.length || project.teamCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="glass-surface w-full rounded-[24px] p-4 lg:w-[340px]">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="inline-flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-700">
                      <span>PROJECT</span>
                      <span>COMPLETION</span>
                    </p>
                    <p className="mt-1.5 text-4xl font-black leading-none text-black">{completionPercent}%</p>
                  </div>
                  <div className="max-w-[164px] text-right text-[11px] leading-6 text-slate-600">
                    <p>Live workspace</p>
                    <p>Standardized for company use</p>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-white/50">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 shadow-[0_0_24px_rgba(59,130,246,0.25)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-[24px] bg-white/35 px-5 py-5 backdrop-blur-md lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Team Members</p>
                <p className="text-sm leading-6 text-slate-700">Fast access to the project group and mentor overview.</p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <article key={`${member.email || member.name}-${member.name}`} className="glass-surface flex items-center gap-3 rounded-full px-3.5 py-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-teal-500 text-sm font-semibold text-white">
                        {member.avatar || member.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="pr-1.5">
                        <p className="text-base font-semibold leading-tight text-black">{member.name}</p>
                        <p className="text-xs text-slate-600">{member.email || "Email pending"}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Team members will appear here after onboarding.</p>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="glass-card rounded-[24px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <nav className="flex flex-wrap gap-2" aria-label="Project sections">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? "glass-button-primary text-white"
                        : "glass-button-secondary text-slate-600 hover:text-slate-900"
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleActivityToggle}
                className="glass-button-secondary rounded-full px-4 py-2 text-sm font-semibold text-slate-700"
                aria-expanded={activityOpen}
                aria-controls="project-activity-panel"
              >
                {activityOpen ? "Hide Activity" : "Show Activity"}
              </button>
              <button
                type="button"
                onClick={handleChatToggle}
                className="glass-button-secondary rounded-full px-4 py-2 text-sm font-semibold text-slate-700"
                aria-expanded={chatOpen}
                aria-controls="project-chat-panel"
              >
                {chatOpen ? "Hide Chat" : "Show Chat"}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-6 ${hasRightPanels ? "lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start" : "lg:grid-cols-1"}`}
        >
          <div className="glass-card rounded-[28px] p-4 sm:p-6">
            {children}
          </div>

          {hasRightPanels && (
            <div className={`space-y-4 ${bothPanelsOpen ? "lg:sticky lg:top-4 lg:h-[calc(100vh-9rem)] lg:overflow-hidden" : ""}`}>
              <AnimatePresence initial={false}>
                {activityOpen && (
                  <motion.div
                    id="project-activity-panel"
                    key="project-activity-panel"
                    className={rightPanelItemClass}
                    initial={{ x: 56, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 56, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ActivityPanel activity={activity} loading={activityLoading} compact={bothPanelsOpen} className="h-full" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {chatOpen && (
                  <motion.div
                    id="project-chat-panel"
                    key="project-chat-panel"
                    className={rightPanelItemClass}
                    initial={{ x: 56, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 56, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ChatPanel projectId={project.id} compact={bothPanelsOpen} className="h-full" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
