import { NavLink } from "react-router-dom";

const menuItems = [
  { label: "Projects", to: "/board" },
  { label: "Reports", to: "/reports" },
  { label: "Budget", to: "/budget" },
  { label: "Documents", to: "/documents" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-dark text-white h-full p-4 border-r border-slate-800">
      <h2 className="font-semibold mb-4 tracking-wide">Menu</h2>

      <nav className="space-y-1" aria-label="Primary">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 transition-colors ${
                isActive
                  ? "bg-slate-800 text-green"
                  : "text-slate-200 hover:text-teal hover:bg-slate-900"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
