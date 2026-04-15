import axios from "axios";

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

export default api;
