import Footer from "../components/Footer";
import LandingNavbar from "../components/landing/LandingNavbar";
import SectionWrapper from "../components/SectionWrapper";

const featureCards = [
  {
    title: "Task Management",
    description:
      "Organize project activities through structured task boards with assigned ownership, deadlines, and progress tracking. Enables students and teams to manage daily work efficiently.",
  },
  {
    title: "Workflow System",
    description:
      "Implements a stage-based workflow from ideation to final delivery, ensuring each project progresses through predefined milestones with clear status transitions.",
  },
  {
    title: "Reports and Budget",
    description:
      "Integrates progress reporting with budget tracking, allowing management to monitor financial usage alongside project development in real time.",
  },
  {
    title: "Document Workflow",
    description:
      "Supports structured document submission, verification, and approval with role-based access, ensuring all project records are securely maintained and traceable.",
  },
  {
    title: "Approval System",
    description:
      "Enables mentors and managers to review and approve submissions with timestamped logs, maintaining transparency and accountability in decision-making.",
  },
];

const workspaceFlowCards = [
  {
    title: "Mentor Workspace",
    description: "Provides mentors with a comprehensive dashboard to review student progress, evaluate submissions, and guide project development.",
    gradient: "from-[#0f2a44] to-[#1f4b87]",
    bullets: [
      "Review project reports and submissions",
      "Approve or reject milestones",
      "Provide structured feedback",
      "Track team performance and progress",
    ],
  },
  {
    title: "Student Workspace",
    description: "Enables students to manage their innovation projects efficiently through a structured workflow system.",
    gradient: "from-[#1f4b87] to-[#2a5fa3]",
    bullets: [
      "Create and manage project tasks",
      "Submit documents and reports",
      "Track milestone progress",
      "Collaborate with team members",
    ],
  },
  {
    title: "Manager Workspace",
    description: "Allows administrators and managers to oversee project execution and ensure smooth workflow across all teams.",
    gradient: "from-[#2a5fa3] to-[#0ea5a4]",
    bullets: [
      "Assign priorities and monitor workflows",
      "Analyze project performance",
      "Review reports and approvals",
      "Ensure timely completion of milestones",
    ],
  },
];

const workflowChips = [
  {
    title: "EDUCORE",
    subtitle: "Learning & analytics",
  },
  {
    title: "MENTORGRID",
    subtitle: "Mentorship network",
  },
  {
    title: "BOARDSYNC",
    subtitle: "Task coordination",
  },
  {
    title: "CAMPUSFLOW",
    subtitle: "Workflow automation",
  },
  {
    title: "REVIEWIQ",
    subtitle: "Evaluation system",
  },
  {
    title: "CERTIPATH",
    subtitle: "Certification tracking",
  },
];

export default function ProjectDetailsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-100 text-slate-900">
      <LandingNavbar />

      {/* Hero Section */}
      <SectionWrapper>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Our Platform</p>
          <h1 className="heading-font mt-3 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            Innovation Hub OS
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            A centralized workflow and project management platform designed specifically for innovation ecosystems like
            NAIN.
          </p>
        </div>
      </SectionWrapper>

      {/* About Platform */}
      <SectionWrapper>
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="heading-font text-3xl font-semibold text-slate-900">Workflow Platform for Innovation Ecosystems</h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-slate-600">
            <p>
              Innovation Hub OS is a centralized workflow and project management platform designed specifically for
              innovation ecosystems like NAIN. It enables seamless coordination between students, mentors, and
              management through a unified digital workspace.
            </p>
            <p>
              The platform integrates task management, milestone tracking, approval workflows, budget monitoring, and
              document lifecycle management into a single system, ensuring transparency and accountability at every
              stage of project execution.
            </p>
            <p>
              By digitizing the innovation process, Innovation Hub OS reduces manual coordination, improves
              communication, and enhances the efficiency of project monitoring and delivery.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Features */}
      <SectionWrapper as="section" id="features" className="pb-16">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Core Capabilities</p>
          <h2 className="heading-font mt-2 text-3xl font-semibold text-slate-900">Main Platform Features</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.06)]"
            >
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </SectionWrapper>

      {/* Workspace Roles */}
      <SectionWrapper as="section" id="workflows" className="pb-16">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200/70 p-7 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">User Roles</p>
            <h2 className="heading-font mt-2 text-3xl font-semibold text-slate-900">Workspace for Every Role</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {workspaceFlowCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
                <div className={`mb-4 h-28 rounded-2xl bg-gradient-to-r ${card.gradient}`} />
                <h3 className="heading-font text-2xl font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{card.description}</p>
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        ✓
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="workflow-text mt-8 rounded-2xl border border-white/70 bg-white p-6 text-base leading-7 text-slate-600 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
            <strong className="text-slate-900">Unified Workflow Architecture:</strong><br /><br />
            Innovation Hub OS integrates task management, reporting systems, budget tracking, and document workflows
            into a single unified platform. This structured approach ensures transparency, accountability, and
            efficient coordination across all stages of innovation projects.
          </div>

          <div className="ad-flow mt-6">
            <div className="ad-flow-track">
              {[...workflowChips, ...workflowChips].map((chip, index) => (
                <span
                  key={`${chip.title}-${index}`}
                  className="ad-chip flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {chip.title}
                    </span>
                    <span className="block text-sm font-semibold text-slate-800">{chip.subtitle}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      <Footer />
    </main>
  );
}
