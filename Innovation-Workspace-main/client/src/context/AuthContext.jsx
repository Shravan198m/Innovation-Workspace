import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { normalizeRole } from "../utils/roles";

const AUTH_STORAGE_KEY = "innovationHubAuth";
const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";

const AuthContext = createContext(null);

function decodeJwtPayload(token) {
  try {
    const payloadSegment = String(token || "").split(".")[1];
    if (!payloadSegment) {
      return null;
    }

    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return Date.now() >= Number(payload.exp) * 1000;
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

function persistAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  localStorage.setItem(LEGACY_TOKEN_KEY, auth.token);
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(auth.user));
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ token: "", user: null });
  const [loading, setLoading] = useState(true);

  const normalizeUser = (user) => {
    if (!user) {
      return null;
    }

    return {
      ...user,
      role: normalizeRole(user.role),
    };
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.user) {
          if (isTokenExpired(parsed.token)) {
            clearStoredAuth();
            setAuth({ token: "", user: null });
            return;
          }

          setAuth({
            token: parsed.token,
            user: normalizeUser(parsed.user),
          });
          return;
        }
      }

      const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
      const legacyUserRaw = localStorage.getItem(LEGACY_USER_KEY);
      if (legacyToken && legacyUserRaw && !isTokenExpired(legacyToken)) {
        const legacyUser = JSON.parse(legacyUserRaw);
        const nextAuth = { token: legacyToken, user: normalizeUser(legacyUser) };
        setAuth(nextAuth);
        persistAuth(nextAuth);
      } else if (legacyToken || legacyUserRaw) {
        clearStoredAuth();
      }
    } catch {
      setAuth({ token: "", user: null });
      clearStoredAuth();
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
      user: normalizeUser(response.data.user),
    };

    setAuth(nextAuth);
    persistAuth(nextAuth);
    return nextAuth;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", {
      name: payload.name,
      email: payload.email,
      password: payload.password,
    });

    const nextAuth = {
      token: response.data.token,
      user: normalizeUser(response.data.user),
    };

    setAuth(nextAuth);
    persistAuth(nextAuth);
    return nextAuth;
  };

  const googleLogin = async (credential) => {
    const response = await api.post("/auth/google", {
      token: credential,
    });

    const nextAuth = {
      token: response.data.token,
      user: normalizeUser(response.data.user),
    };

    setAuth(nextAuth);
    persistAuth(nextAuth);
    return nextAuth;
  };

  const logout = () => {
    setAuth({ token: "", user: null });
    clearStoredAuth();
  };

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token),
      loading,
      login,
      register,
      googleLogin,
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
