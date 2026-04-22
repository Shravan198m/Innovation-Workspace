import axios from "axios";

const AUTH_STORAGE_KEY = "innovationHubAuth";
const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";

function handleUnauthorizedSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    // ignore storage failures
  }

  if (typeof window === "undefined") {
    return;
  }

  const current = `${window.location.pathname || "/"}${window.location.search || ""}`;
  if (!window.location.pathname.startsWith("/login")) {
    const destination = `/login?reason=session-expired&from=${encodeURIComponent(current)}`;
    window.location.assign(destination);
  }
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const authRaw = localStorage.getItem("innovationHubAuth");
  if (!authRaw) {
    return config;
  }

  try {
    const auth = JSON.parse(authRaw);
    if (auth?.token) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }
  } catch {
    // ignore malformed local auth
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const isAuthEndpoint = /\/auth\/(login|register)$/.test(requestUrl);

    if (status === 401 && !isAuthEndpoint) {
      handleUnauthorizedSession();
    }

    return Promise.reject(error);
  }
);

export default api;
