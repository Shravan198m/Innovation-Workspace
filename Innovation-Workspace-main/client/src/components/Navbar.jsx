import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, isAuthenticated, logout } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

	const displayName = String(user?.name || "").trim() || "User";
	const initials = useMemo(() => {
		const parts = displayName.split(/\s+/).filter(Boolean);
		if (!parts.length) {
			return "U";
		}

		return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
	}, [displayName]);

	useEffect(() => {
		const handlePointerDown = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setMenuOpen(false);
			}
		};

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const handleLogout = () => {
		logout();
		setMenuOpen(false);
		navigate("/", { replace: true });
	};

	return (
		<header className="sticky top-0 z-50 border-b border-cyan-400/20 bg-[#07142a]/90 backdrop-blur-xl">
			<div className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between gap-4 px-4 lg:px-6">
				{/* Left Section: MITE + K-tech */}
				<div className="flex min-w-0 items-center gap-2 sm:gap-2">
					<img src="/nain-logos/3.png" alt="MITE logo" className="h-12 w-auto shrink-0 object-contain sm:h-14" />
					<img src="/nain-logos/2.png" alt="K-tech logo" className="h-8 w-auto shrink-0 object-contain sm:h-9" />
				</div>

				{/* Center Section: IH + Navigation */}
				<div className="flex flex-1 items-center justify-center gap-6 sm:gap-8">
					<button onClick={() => navigate("/")} className="shrink-0" aria-label="Innovation Hub OS home">
						<Logo compact />
					</button>

					<nav className="hidden flex-none items-center gap-6 md:flex" aria-label="Primary navigation">
						<button
							onClick={() => navigate("/")}
							className={`text-sm font-semibold transition ${
								location.pathname === "/" ? "text-cyan-300" : "text-slate-100 hover:text-cyan-200"
							}`}
						>
							HOME
						</button>
						<button
							onClick={() => navigate("/nain")}
							className={`text-sm font-semibold transition ${
								location.pathname === "/nain" ? "text-cyan-300" : "text-slate-100 hover:text-cyan-200"
							}`}
						>
							NAIN
						</button>
						<button
							onClick={() => navigate("/project-details")}
							className={`text-sm font-semibold transition ${
								location.pathname === "/project-details" ? "text-cyan-300" : "text-slate-100 hover:text-cyan-200"
							}`}
						>
							PROJECT DETAILS
						</button>
					</nav>
				</div>

				{/* Right Section: User Avatar + NAIN Badge */}
				<div className="flex items-center gap-3 sm:gap-4">
					{isAuthenticated ? (
						<div ref={menuRef} className="relative">
							<button
								type="button"
								onClick={() => setMenuOpen((prev) => !prev)}
								className="flex items-center rounded-full border border-white/10 bg-white/6 p-1 transition hover:bg-white/10"
								aria-haspopup="menu"
								aria-expanded={menuOpen}
							>
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-semibold text-white">
									{initials}
								</span>
							</button>

							{menuOpen && (
								<div className="absolute right-0 top-[calc(100%+0.5rem)] w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
									<button type="button" className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
										Profile
									</button>
									<button type="button" className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
										Settings
									</button>
									<button type="button" className="block w-full px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={handleLogout}>
										Logout
									</button>
								</div>
							)}
						</div>
					) : (
						<button
							type="button"
							onClick={() => navigate("/login")}
							className="rounded-lg border border-slate-500/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/50 hover:bg-white/5"
						>
							Sign In
						</button>
					)}

					<img src="/nain-logos/4.png" alt="NAIN badge" className="hidden h-10 w-auto shrink-0 object-contain sm:block" />
				</div>
			</div>
		</header>
	);
}
