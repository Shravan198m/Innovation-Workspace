import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import socket from "../socket";
import { Bell } from "lucide-react";
import Logo from "./Logo";
import { getRoleLabel, normalizeRole } from "../utils/roles";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isHomePage = location.pathname === "/";
  const currentUserRole = normalizeRole(user?.role);
  const roleLabel = getRoleLabel(currentUserRole);
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
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-4 px-4 lg:px-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="glass-card app-elevate flex items-center gap-3 rounded-2xl px-3 py-2 text-left"
        >
          <Logo />
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {!user ? (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="glass-button-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Login
            </button>
          ) : isHomePage ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-cyan-200">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : "U"}
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                className="glass-button-secondary rounded-xl px-4 py-2 text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <span className="hidden rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 sm:inline-flex">
                {roleLabel}
              </span>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="glass-button-secondary relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700"
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
                  <div className="glass-panel absolute right-0 top-12 z-50 w-80 rounded-2xl p-3">
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
                                ? "border-white/50 bg-white/70 text-slate-600"
                                : "border-blue-200 bg-blue-50/80 text-slate-700"
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

              <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user?.name || "User"}</span>

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                className="glass-button-secondary rounded-xl px-4 py-2 text-sm font-medium"
              >
                Logout
              </button>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-cyan-200">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : "U"}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
