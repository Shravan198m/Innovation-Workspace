import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

const showcaseCards = [
  {
    id: "mentor",
    title: "Mentor Workspace",
    subtitle: "Review reports, approve milestones, and guide teams.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    id: "student",
    title: "Student Workspace",
    subtitle: "Manage tasks, submit documents, and track delivery.",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    id: "manager",
    title: "Manager Workspace",
    subtitle: "Oversee delivery, assign priorities, and unblock execution.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const workspaceDetails = {
  mentor: {
    title: "Mentor Work Table",
    points: [
      "Report review happens daily to keep mentor feedback current.",
      "Milestone validation is checked weekly before approvals move ahead.",
      "Risk follow-up is tracked twice a week for escalation control.",
    ],
  },
  student: {
    title: "Student Work Table",
    points: [
      "Task updates are entered daily so progress stays visible.",
      "Document uploads happen weekly with verified submission history.",
      "Delivery tracking keeps completion status and deadlines aligned.",
    ],
  },
  manager: {
    title: "Manager Work Table",
    points: [
      "Project allocation is updated as needed with clear ownership.",
      "Portfolio tracking runs daily to keep KPI visibility current.",
      "Blocker resolution is reviewed weekly until action items close.",
    ],
  },
};

const profileCards = [
  {
    name: "Richard Jefferson",
    role: "Project Mentor",
    org: "Electronics Division",
    initials: "RJ",
    tilt: "-rotate-2",
    offset: "mt-4",
  },
  {
    name: "Ashley Stapleton",
    role: "Student Lead",
    org: "Smart Watering System",
    initials: "AS",
    tilt: "rotate-1",
    offset: "-mt-2",
  },
  {
    name: "Joseph Graham",
    role: "Program Manager",
    org: "Innovation Hub Office",
    initials: "JG",
    tilt: "-rotate-1",
    offset: "mt-5",
  },
];

const trustedLogos = [
  {
    name: "EduCore",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8L12 3L21 8L12 13L3 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10V15C6 16.6 8.7 18 12 18C15.3 18 18 16.6 18 15V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "MentorGrid",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
        <rect x="14" y="4" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="14" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M17 14V20M14 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "BoardSync",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 7H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 12H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 17H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    name: "CampusFlow",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12C4 8 7 5 11 5H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 5L17 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 5L17 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 12C20 16 17 19 13 19H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 19L7 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 19L7 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "ReviewIQ",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M11 8V11L13 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 16L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "CertiPath",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L20 7V13C20 17 16.5 20.5 12 22C7.5 20.5 4 17 4 13V7L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const rootRef = useRef(null);
  const [navSolid, setNavSolid] = useState(false);
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState(null);

  useEffect(() => {
    const root = rootRef.current;
    const elements = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    elements.forEach((element) => observer.observe(element));

    const handleScroll = () => {
      setNavSolid(window.scrollY > 18);
    };

    const handleMouseMove = (event) => {
      if (!root) {
        return;
      }

      const x = (event.clientX - window.innerWidth / 2) / 24;
      const y = (event.clientY - window.innerHeight / 2) / 24;
      root.style.setProperty("--mouse-x", `${x.toFixed(2)}px`);
      root.style.setProperty("--mouse-y", `${y.toFixed(2)}px`);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const openWorkspace = () => {
    navigate("/projects");
  };

  const openLogin = () => {
    navigate("/login");
  };

  return (
    <main
      ref={rootRef}
      className="landing-parallax min-h-screen bg-[radial-gradient(circle_at_20%_20%,_#e0ecff,_transparent_40%),radial-gradient(circle_at_80%_80%,_#dbeafe,_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]"
      style={{ "--mouse-x": "0px", "--mouse-y": "0px" }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="parallax-orb-a absolute left-[8%] top-[8%] h-64 w-64 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="parallax-orb-b absolute right-[10%] top-[24%] h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="parallax-orb-c absolute bottom-[8%] left-[30%] h-72 w-72 rounded-full bg-indigo-200/28 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,rgba(238,242,255,0),rgba(203,213,225,0.36)_72%,rgba(186,200,220,0.5)_100%)]" />

      <header
        className={`sticky top-0 z-40 mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-4 transition-all duration-300 lg:px-10 ${
          navSolid
            ? "rounded-b-2xl border border-white/50 bg-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <Logo />
        </div>

        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={openLogin}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </button>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-teal-400 text-sm font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1500px] items-start gap-8 px-6 pb-10 pt-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:pt-10">
        <div className="reveal-on-scroll" data-reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Company-grade academic operations</p>
          <h1 className="heading-font heading-xl mt-4 max-w-[860px] text-slate-900">
            <span className="block">Build, Track, Review and</span>
            <span className="block">Deliver Academic Projects</span>
            <span className="block">in One Unified Workspace</span>
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            A single platform for students, mentors, and managers to manage tasks, approvals, budgets,
            reports, and documents with real-time progress visibility.
          </p>

          <div className="mt-10">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={openLogin}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Login to Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={openWorkspace}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-teal-600"
              >
                Enter Workflow -&gt;
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Secure login is enabled with role-aware access controls for workspace pages.
          </p>

        </div>

        <div className="reveal-on-scroll relative hidden self-center rounded-[30px] border border-white/40 bg-white/55 p-5 shadow-[0_28px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl lg:block" data-reveal>
          <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),transparent_42%),linear-gradient(160deg,rgba(255,255,255,0.64),rgba(255,255,255,0.2))]" />

          <div className="relative z-10 flex items-start gap-3">
            {profileCards.map((card, index) => (
              <article
                key={card.name}
                className={`floating-profile-card w-[31.5%] min-w-[170px] rounded-3xl border border-white/50 bg-white/88 p-3.5 shadow-[0_18px_34px_rgba(15,23,42,0.13)] backdrop-blur-sm ${card.tilt} ${card.offset}`}
                style={{ animationDelay: `${index * 0.45}s` }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white">
                    {card.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{card.name}</p>
                    <p className="text-xs text-slate-500">{card.role}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{card.org}</p>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${72 + index * 8}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="relative z-10 mt-3 rounded-3xl border border-white/55 bg-white/80 p-3.5 shadow-[0_14px_28px_rgba(15,23,42,0.09)] backdrop-blur-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow Signals</p>
            <div className="space-y-1.5">
              {[
                "Mentor approvals synced across all tabs",
                "Budget and reports linked to project milestones",
                "Documents verified with review state tracking",
              ].map((line) => (
                <div key={line} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1500px] px-6 pb-14 lg:px-10">
        <div className="reveal-on-scroll grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-reveal>
          {[
            { label: "Projects", value: "120+" },
            { label: "Mentors", value: "40+" },
            { label: "Reports", value: "Live" },
            { label: "Budgeting", value: "Enabled" },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/55 bg-white/75 px-4 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="reveal-on-scroll mt-4 rounded-3xl border border-slate-200/70 bg-white/75 p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm" data-reveal>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Live Workspace Snapshot</p>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">Realtime</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { title: "Task Board", value: "124 Cards", color: "from-blue-500 to-cyan-400" },
              { title: "Reports", value: "26 Pending", color: "from-violet-500 to-indigo-500" },
              { title: "Budgets", value: "₹4.8L", color: "from-emerald-500 to-teal-500" },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className={`mb-2 h-1.5 w-full rounded-full bg-gradient-to-r ${item.color}`} />
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{item.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="reveal-on-scroll mt-2 grid gap-5 md:grid-cols-3" data-reveal>
          {showcaseCards.map((card) => (
            <article
              key={card.title}
              className={`rounded-[22px] border bg-white/75 p-5 text-left shadow-[0_18px_42px_rgba(15,23,42,0.1)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.14)] ${
                expandedWorkspaceId === card.id ? "border-cyan-300" : "border-white/50"
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedWorkspaceId((prev) => (prev === card.id ? null : card.id))}
                className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded-2xl"
                aria-expanded={expandedWorkspaceId === card.id}
              >
                <div className={`mb-4 h-28 rounded-2xl bg-gradient-to-r ${card.gradient}`} />
                <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.subtitle}</p>
              </button>

              {expandedWorkspaceId !== null && (
                <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                  {(workspaceDetails[card.id]?.points || []).map((point) => (
                    <div key={point} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="mt-1 h-2 w-2 rounded-full bg-cyan-500" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="reveal-on-scroll mt-12 rounded-2xl border border-slate-200/70 bg-white/65 px-6 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm" data-reveal>
          <p className="text-sm text-slate-600">
            Trusted workflow structure: Board, Reports, Budget, and Documents integrated under one project shell.
          </p>
        </div>

        <div className="reveal-on-scroll mt-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/65 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm" data-reveal>
          <div className="logo-marquee-track flex min-w-max items-center gap-12 px-4 text-sm font-semibold text-slate-500">
            {[...trustedLogos, ...trustedLogos].map((logo, index) => (
              <article key={`${logo.name}-${index}`} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2">
                <span className="text-slate-700">{logo.mark}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{logo.name}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
