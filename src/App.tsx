import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import { EmailVerificationRoute } from "./routes/EmailVerificationRoute";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicRoute } from "./routes/PublicRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { StudentDashboard } from "./pages/panel/student/Dashboard";
import ProfilePage from "./pages/panel/student/ProfilePage";
import DocsPage from "./pages/panel/student/DocsPage";
import MentorshipPage from "./pages/panel/student/MentorshipPage";
import OverviewPage from "./pages/panel/student/OverviewPage";
import PerformancePage from "./pages/panel/student/PerformancePage";
import WrongAnswersPage from "./pages/panel/student/WrongAnswersPage";
import { TeacherDashboard } from "./pages/panel/teacher/Dashboard";
import { features } from "./config/features";
import type { JSX } from "react";

function App(): JSX.Element {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        {/* Public routes (redirect authenticated+verified users to panel) */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Standalone auth utility routes – no redirect guards */}
        <Route path="/email-dogrulama" element={<EmailVerificationRoute />} />
        <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />

        {/* Protected panel routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRole="student" />}>
            <Route path="/panel/student" element={<StudentDashboard />}>
              <Route index element={<Navigate to="genel-bakis" replace />} />
              <Route path="genel-bakis" element={<OverviewPage />} />
              <Route path="dokumanlarim" element={<DocsPage />} />
              <Route path="performans" element={<PerformancePage />} />
              <Route path="yanlislarim" element={<WrongAnswersPage />} />
              <Route path="mentorluk" element={<MentorshipPage />} />
              <Route path="profilim" element={<ProfilePage />} />
            </Route>
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
