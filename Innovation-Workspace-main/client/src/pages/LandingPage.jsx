import LandingNavbar from "../components/landing/LandingNavbar";
import LandingHero from "../components/landing/LandingHero";

export default function LandingPage() {
  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <LandingNavbar />
      <div className="flex-1 min-h-0">
        <LandingHero />
      </div>
      <footer className="border-t border-white/15 bg-[#0f2a44]/80 px-4 py-3 text-center text-xs text-slate-100 backdrop-blur-sm sm:text-sm">
        © 2026 Shiktra Technologies. All rights reserved.
      </footer>
    </main>
  );
}