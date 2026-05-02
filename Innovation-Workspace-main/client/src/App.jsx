import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PageWrapper from "./components/PageWrapper";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProjectsProvider } from "./context/ProjectsContext";
import MainLayout from "./layouts/MainLayout";
import AuthPage from "./pages/AuthPage";
import Budget from "./pages/Budget";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import LandingPage from "./pages/LandingPage";
import NAINPage from "./pages/NAINPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import Planner from "./pages/Planner";
import ProjectBoard from "./pages/ProjectBoard";
import Reports from "./pages/Reports";
import { normalizeRole } from "./utils/roles";

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();
  const currentUserRole = normalizeRole(user?.role);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={(
            <PageWrapper>
              <LandingPage />
            </PageWrapper>
          )}
        />
        <Route
          path="/nain"
          element={(
            <PageWrapper>
              <NAINPage />
            </PageWrapper>
          )}
        />
        <Route
          path="/project-details"
          element={(
            <PageWrapper>
              <ProjectDetailsPage />
            </PageWrapper>
          )}
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/projects" replace />
            ) : (
              <PageWrapper>
                <AuthPage />
              </PageWrapper>
            )
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <ProjectsProvider>
                <MainLayout />
              </ProjectsProvider>
            </ProtectedRoute>
          }
        >
          <Route
            path="/projects"
            element={(
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            )}
          />
          <Route
            path="/projects/:projectId/board"
            element={(
              <PageWrapper>
                <ProjectBoard
                  currentUserRole={currentUserRole}
                  currentUserName={user?.name || ""}
                  currentUserEmail={user?.email || ""}
                />
              </PageWrapper>
            )}
          />
          <Route
            path="/projects/:projectId/reports"
            element={(
              <PageWrapper>
                <Reports />
              </PageWrapper>
            )}
          />
          <Route
            path="/projects/:projectId/budget"
            element={(
              <PageWrapper>
                <Budget />
              </PageWrapper>
            )}
          />
          <Route
            path="/projects/:projectId/documents"
            element={(
              <PageWrapper>
                <Documents />
              </PageWrapper>
            )}
          />
          <Route
            path="/projects/:projectId/planner"
            element={(
              <PageWrapper>
                <Planner />
              </PageWrapper>
            )}
          />
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
