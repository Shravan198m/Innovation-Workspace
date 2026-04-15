import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProjectsProvider } from "./context/ProjectsContext";
import MainLayout from "./layouts/MainLayout";
import AuthPage from "./pages/AuthPage";
import Budget from "./pages/Budget";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import LandingPage from "./pages/LandingPage";
import ProjectBoard from "./pages/ProjectBoard";
import Reports from "./pages/Reports";

function AppRoutes() {
  const { user } = useAuth();
  const currentUserRole = user?.role || "STUDENT";

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route
          element={
            <ProtectedRoute>
              <ProjectsProvider>
                <MainLayout />
              </ProjectsProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/projects" element={<Dashboard />} />
          <Route
            path="/projects/:projectId/board"
            element={<ProjectBoard currentUserRole={currentUserRole} />}
          />
          <Route path="/projects/:projectId/reports" element={<Reports />} />
          <Route path="/projects/:projectId/budget" element={<Budget />} />
          <Route path="/projects/:projectId/documents" element={<Documents />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
