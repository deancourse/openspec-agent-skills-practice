import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { AttendancePage } from "./pages/AttendancePage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { LeavePage } from "./pages/LeavePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { OvertimePage } from "./pages/OvertimePage.jsx";
import { SetupPasswordPage } from "./pages/SetupPasswordPage.jsx";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/setup-password" element={<SetupPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Layout>
              <AdminPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <AttendancePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <Layout>
              <LeavePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/overtime"
        element={
          <ProtectedRoute>
            <Layout>
              <OvertimePage />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

