import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GoogleLoginBtn from "../components/GoogleLoginBtn";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

const allowedEmailDomains = String(process.env.REACT_APP_ALLOWED_EMAIL_DOMAINS || "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

function isAllowedDomainEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] || "";

  if (!domain || allowedEmailDomains.length === 0) {
    return true;
  }

  return allowedEmailDomains.includes(domain);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, googleLogin } = useAuth();

  const [mode, setMode] = useState("login");
  const [loginMethod, setLoginMethod] = useState("google");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });

  const redirectTo = location.state?.from?.pathname || "/projects";

  const getRedirectTarget = (user) => {
    const role = String(user?.role || "student").trim().toLowerCase();

    if (role === "admin" || role === "mentor" || role === "team_lead") {
      return "/projects";
    }

    return redirectTo;
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (!isAllowedDomainEmail(form.email)) {
      setSubmitting(false);
      setError(`Use your college email domain (${allowedEmailDomains.join(", ")}) to continue.`);
      return;
    }

    try {
      let nextAuth;

      if (mode === "register") {
        nextAuth = await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
      } else {
        nextAuth = await login({
          email: form.email.trim(),
          password: form.password,
        });
      }

      navigate(getRedirectTarget(nextAuth?.user), { replace: true });
    } catch (submitError) {
      const serverMessage = submitError?.response?.data?.message;
      if (serverMessage) {
        setError(serverMessage);
      } else if (submitError?.request) {
        setError("Cannot reach authentication service. Check backend server and CORS settings.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    if (!credential) {
      setError("Google login did not return a credential.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const nextAuth = await googleLogin(credential);
      navigate(getRedirectTarget(nextAuth.user), { replace: true });
    } catch (submitError) {
      const serverMessage = submitError?.response?.data?.message;
      if (serverMessage) {
        setError(serverMessage);
      } else if (submitError?.request) {
        setError("Cannot reach authentication service. Check backend server and CORS settings.");
      } else {
        setError("Google login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="app-page flex items-center justify-center px-4">
      <div className="glass-panel w-full max-w-2xl overflow-hidden rounded-[32px]">
        <div className="bg-[linear-gradient(135deg,rgba(37,99,235,0.16)_0%,rgba(14,165,164,0.14)_100%)] px-8 py-10 text-slate-900">
          <Logo />
          <h1 className="heading-lg mt-4">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-muted mt-3 max-w-xl text-sm leading-6">
            Secure access for students, team leads, mentors, and admins. Role-based permissions are enforced across the workspace.
          </p>
        </div>

        <div className="space-y-5 px-8 py-8">
          <div className="grid grid-cols-2 rounded-2xl bg-white/40 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLoginMethod("google");
                setError("");
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "glass-button-primary text-white"
                  : "glass-button-secondary text-slate-600 hover:text-slate-900"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "glass-button-primary text-white"
                  : "glass-button-secondary text-slate-600 hover:text-slate-900"
              }`}
            >
              Register
            </button>
          </div>

          {mode === "register" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                  placeholder="you@college.edu"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  required
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value)}
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                >
                  <option value="student">Student</option>
                   <option value="team_lead">Team Lead</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {error && (
                <p className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 backdrop-blur-sm">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="glass-button-primary w-full rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? "Please wait..." : "Create Account"}
              </button>
            </form>
          ) : loginMethod === "password" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                  placeholder="you@college.edu"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  required
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                  placeholder="Enter password"
                />
              </div>

              {error && (
                <p className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 backdrop-blur-sm">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="glass-button-primary w-full rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? "Please wait..." : "Login to Workspace"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMethod("google");
                  setError("");
                }}
                className="glass-button-secondary w-full rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Use Google instead
              </button>
            </form>
          ) : (
            <div className="rounded-[28px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(241,245,249,0.72)_100%)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Quick access</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">Continue with Google</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Use your Google account to enter the workspace without another password.
                  </p>
                </div>
                <div className="glass-pill rounded-full px-3 py-1 text-[11px] font-semibold text-slate-700">
                  Secure sign-in
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                <GoogleLoginBtn onSuccess={handleGoogleLogin} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-white/70 px-3 py-1">Auto user creation</span>
                <span className="rounded-full bg-white/70 px-3 py-1">Role-aware access</span>
                <span className="rounded-full bg-white/70 px-3 py-1">Same project session</span>
                {allowedEmailDomains.length > 0 && (
                  <span className="rounded-full bg-white/70 px-3 py-1">
                    Allowed domains: {allowedEmailDomains.join(", ")}
                  </span>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod("password");
                    setError("");
                  }}
                  className="glass-button-secondary flex-1 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Use password instead
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
