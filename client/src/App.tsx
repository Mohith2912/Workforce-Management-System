import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { AdminPage } from "./pages/AdminPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { AttendancePage } from "./pages/AttendancePage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { LeavePage } from "./pages/LeavePage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { useAuth } from "./features/auth/store";

const theme = createTheme({
  palette: { primary: { main: "#0f4c81" }, background: { default: "#f4f6f8" } },
});
const qc = new QueryClient();

function LoginGate() {
  const user = useAuth((s) => s.user);
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginGate />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="leave" element={<LeavePage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route element={<ProtectedRoute roles={["MANAGER", "ADMIN"]} />}>
                  <Route path="approvals" element={<ApprovalsPage />} />
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                  <Route path="admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
