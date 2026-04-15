import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AUTH_STORAGE_KEY = "innovationHubAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ token: "", user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.user) {
          setAuth(parsed);
        }
      }
    } catch {
      setAuth({ token: "", user: null });
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (payload) => {
    const response = await api.post("/auth/login", {
      email: payload.email,
      password: payload.password,
    });

    const nextAuth = {
      token: response.data.token,
      user: response.data.user,
    };

    setAuth(nextAuth);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    return nextAuth;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    });

    const nextAuth = {
      token: response.data.token,
      user: response.data.user,
    };

    setAuth(nextAuth);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    return nextAuth;
  };

  const logout = () => {
    setAuth({ token: "", user: null });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token),
      loading,
      login,
      register,
      logout,
    }),
    [auth, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
