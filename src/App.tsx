import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicRoute } from "./routes/PublicRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { StudentDashboard } from "./pages/panel/student/Dashboard";
import { TeacherDashboard } from "./pages/panel/teacher/Dashboard";
import { features } from "./config/features";
import type { JSX } from "react";

function App(): JSX.Element {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected panel routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRole="student" />}>
            <Route path="/panel/student" element={<StudentDashboard />} />
          </Route>
          {features.enableTeacherFeatures && (
            <Route element={<RoleRoute allowedRole="teacher" />}>
              <Route path="/panel/teacher" element={<TeacherDashboard />} />
            </Route>
          )}
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
