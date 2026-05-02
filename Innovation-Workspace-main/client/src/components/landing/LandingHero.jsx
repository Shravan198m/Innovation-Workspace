import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LandingHero() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section id="home" className="relative h-full overflow-hidden bg-[#081427]">
      <video
        className="absolute inset-0 h-full w-full object-cover brightness-[1.3] contrast-[1.08] saturate-[1.2]"
        playsInline
        muted
        loop
        autoPlay
      >
        <source src="/incubation.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,15,32,0.68)_0%,rgba(5,15,32,0.46)_42%,rgba(5,15,32,0.64)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.16),transparent_38%),radial-gradient(circle_at_82%_72%,rgba(14,165,233,0.12),transparent_34%)]" />

      <div className="relative mx-auto grid h-full w-full max-w-[1100px] gap-8 px-4 py-5 sm:px-6 lg:items-center lg:px-8 lg:py-6">
        <div className="max-w-xl rounded-2xl border border-cyan-200/20 bg-[#072149]/55 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-[2px] sm:p-6">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
            NAIN - MITE Workflow Platform
          </p>
          <h1 className="heading-font text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
            Build the Future with Innovation Hub OS
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            A unified innovation operating system for students, mentors, and managers to run projects, approvals,
            reporting, and delivery in one secure workflow.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? "/projects" : "/login")}
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              {isAuthenticated ? "Open Workspace" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/project-details")}
              className="rounded-xl border border-white/20 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
            >
              Explore Platform
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
            <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5">Project Workflow</span>
            <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5">Role Access</span>
            <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5">Reports & Budget</span>
          </div>
        </div>
      </div>
    </section>
  );
}
