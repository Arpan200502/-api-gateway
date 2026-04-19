import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ApiDetailsPage from "./pages/ApiDetailsPage";
import ApiAllLogsPage from "./pages/ApiAllLogsPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminLogsPage from "./pages/AdminLogsPage";
import AdminUserPage from "./pages/AdminUserPage";
import NotFoundPage from "./pages/NotFoundPage";
import { useAuth } from "./context/AuthContext";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={(
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/dashboard/api/:apiKey"
        element={(
          <PrivateRoute>
            <ApiDetailsPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/dashboard/api/:apiKey/logs"
        element={(
          <PrivateRoute>
            <ApiAllLogsPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/admin/overview"
        element={(
          <AdminRoute>
            <AdminOverviewPage />
          </AdminRoute>
        )}
      />
      <Route
        path="/admin/logs"
        element={(
          <AdminRoute>
            <AdminLogsPage />
          </AdminRoute>
        )}
      />
      <Route
        path="/admin/user/:userId"
        element={(
          <AdminRoute>
            <AdminUserPage />
          </AdminRoute>
        )}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
