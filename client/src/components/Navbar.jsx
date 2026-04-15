import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import socket from "../socket";
import { Bell, Search } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentUserRole = user?.role || "STUDENT";
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        const response = await api.get("/notifications/me");
        if (mounted) {
          setNotifications(Array.isArray(response.data) ? response.data : []);
        }
      } catch {
        if (mounted) {
          setNotifications([]);
        }
      }
    };

    if (user?.id) {
      if (!socket.connected) {
        socket.connect();
      }

      fetchNotifications();
      socket.emit("joinUser", user.id);

      const onNotificationAdded = (notification) => {
        setNotifications((prev) => [notification, ...prev].slice(0, 30));
      };

      socket.on("notificationAdded", onNotificationAdded);

      return () => {
        mounted = false;
        socket.off("notificationAdded", onNotificationAdded);
      };
    }

    return () => {
      mounted = false;
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user?.id]);

  const markAsRead = async (notificationId) => {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? response.data : notification
        )
      );
    } catch {
      // Ignore marking errors in UI.
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-4 px-4 lg:px-6">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:shadow-sm"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
            IH
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Innovation Hub</p>
            <p className="text-sm font-semibold text-slate-900 leading-tight">Project Workspace</p>
          </div>
        </button>

        <div className="relative hidden flex-1 items-center lg:flex">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            placeholder="Search projects, reports, tasks, or members"
            aria-label="Search projects"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 sm:inline-flex">
            {currentUserRole}
          </span>

          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Projects
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Notifications</p>
                <div className="max-h-80 space-y-2 overflow-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          notification.read
                            ? "border-slate-200 bg-slate-50 text-slate-600"
                            : "border-blue-200 bg-blue-50 text-slate-700"
                        }`}
                      >
                        <p className="text-sm leading-5">{notification.message}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {notification.createdAt
                            ? new Date(notification.createdAt).toLocaleString()
                            : "Just now"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Logout
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-cyan-200">
            {user?.name ? user.name.slice(0, 1).toUpperCase() : "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
