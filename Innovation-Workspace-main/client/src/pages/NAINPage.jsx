import Footer from "../components/Footer";
import LandingNavbar from "../components/landing/LandingNavbar";
import SectionWrapper from "../components/SectionWrapper";

const successCompanyLogos = [
  "/mite-companies/6.png",
  "/mite-companies/7.png",
  "/mite-companies/8.png",
  "/mite-companies/9.png",
  "/mite-companies/10.png",
  "/mite-companies/11.png",
  "/mite-companies/12.png",
  "/mite-companies/13.png",
  "/mite-companies/14.png",
  "/mite-companies/15.png",
  "/mite-companies/16.png",
  "/mite-companies/17.png",
  "/mite-companies/18.png",
  "/mite-companies/19.png",
  "/mite-companies/20.png",
  "/mite-companies/21.png",
];

export default function NAINPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-100 text-slate-900">
      <LandingNavbar />

      {/* Hero Section */}
      <SectionWrapper>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Government Initiative</p>
            <h1 className="heading-font mt-3 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              New Age Innovation Network
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              A Government of Karnataka innovation initiative implemented at Mangalore Institute of Technology &
              Engineering to strengthen student innovation, startup exploration, and mentor-guided solution building.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 p-8 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
            <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900">
              <video className="h-full w-full object-cover" controls preload="metadata">
                <source src="/chairman.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* About NAIN */}
      <SectionWrapper>
        <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="heading-font text-3xl font-semibold text-slate-900">About NAIN</h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-slate-600">
            <p>
              The New Age Innovation Network (NAIN) is an initiative by the Government of Karnataka, implemented at
              Mangalore Institute of Technology & Engineering (MITE). It is designed to promote innovation,
              entrepreneurship, and startup culture among students.
            </p>
            <p>
              NAIN provides a structured ecosystem where students can identify real-world problems, develop innovative
              solutions, and transform ideas into viable products with the support of mentors, institutional
              infrastructure, and government funding.
            </p>
            <p>
              The program emphasizes interdisciplinary collaboration, hands-on learning, and mentor-guided development
              to prepare students for real-world challenges and entrepreneurial opportunities.
            </p>
          </div>
        </article>
      </SectionWrapper>

      {/* Key Objectives */}
      <SectionWrapper>
        <div className="mb-6">
          <h2 className="heading-font text-3xl font-semibold text-slate-900">Key Objectives</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Foster Innovation Culture",
              description:
                "Create an environment where students think creatively and develop solutions to real-world problems.",
            },
            {
              title: "Support Entrepreneurship",
              description: "Provide mentorship, funding, and resources to transform ideas into startup ventures.",
            },
            {
              title: "Build Competencies",
              description:
                "Develop skills in project management, teamwork, communication, and business acumen among students.",
            },
            {
              title: "Connect Stakeholders",
              description: "Facilitate collaboration between students, mentors, industry experts, and government bodies.",
            },
            {
              title: "Accelerate Execution",
              description:
                "Enable rapid prototyping and validation of ideas through structured workflows and milestones.",
            },
            {
              title: "Create Impact",
              description: "Develop solutions that address societal challenges and contribute to economic growth.",
            },
          ].map((obj) => (
            <article
              key={obj.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.06)]"
            >
              <h3 className="text-lg font-semibold text-slate-900">{obj.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{obj.description}</p>
            </article>
          ))}
        </div>
      </SectionWrapper>

      {/* Second Video Section */}
      <SectionWrapper>
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200/70 p-12 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900">
              <video className="h-full w-full object-cover" controls preload="metadata">
                <source src="/principal.mp4" type="video/mp4" />
              </video>
            </div>
            <div>
              <h2 className="heading-font text-3xl font-semibold text-slate-900">NAIN Success Stories</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                NAIN has enabled numerous students to transform their innovative ideas into successful ventures. Our
                alumni have gone on to establish startups, secure funding, and create meaningful impact in their
                respective domains.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Student-led startups launched",
                  "Patents filed and granted",
                  "Mentors and industry collaborations",
                  "Government funding opportunities",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
                      ✓
                    </span>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper className="pb-16">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200/70 p-7 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">NAIN Startups</p>
            <h2 className="heading-font mt-2 text-3xl font-semibold text-slate-900">Success Companies</h2>
          </div>

          <div className="ad-flow mt-6">
            <div className="ad-flow-track companies-track">
              {[...successCompanyLogos, ...successCompanyLogos].map((logo, index) => (
                <article
                  key={`${logo}-${index}`}
                  className="ad-chip flex h-24 w-[220px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                >
                  <img
                    src={logo}
                    alt="NAIN startup company"
                    className="h-full w-full rounded-lg object-contain"
                    loading="lazy"
                  />
                </article>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      <Footer />
    </main>
  );
}
