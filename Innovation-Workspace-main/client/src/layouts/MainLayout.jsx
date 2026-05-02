import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function MainLayout() {
  return (
    <div className="app-shell bg-[#081427] text-slate-900">
      <Navbar />

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
