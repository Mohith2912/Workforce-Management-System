import {
  AppBar,
  Avatar,
  Badge,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/store";
import { api } from "../api/client";
import { useQuery } from "@tanstack/react-query";

const drawerWidth = 240;

export function AppLayout() {
  const { user, logout, refreshToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: notes } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data as { read: boolean }[],
  });
  const unread = notes?.filter((n) => !n.read).length ?? 0;

  const items = [
    { to: "/", label: "Dashboard", icon: <DashboardIcon />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { to: "/leave", label: "Leave", icon: <EventAvailableIcon />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { to: "/approvals", label: "Approvals", icon: <ThumbUpIcon />, roles: ["MANAGER", "ADMIN"] },
    { to: "/attendance", label: "Attendance", icon: <AccessTimeIcon />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { to: "/employees", label: "Employees", icon: <GroupsIcon />, roles: ["MANAGER", "ADMIN"] },
    { to: "/reports", label: "Reports", icon: <AssessmentIcon />, roles: ["MANAGER", "ADMIN"] },
    { to: "/admin", label: "Admin", icon: <AdminPanelSettingsIcon />, roles: ["ADMIN"] },
    { to: "/notifications", label: "Notifications", icon: <NotificationsIcon />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
  ].filter((i) => user && i.roles.includes(user.role));

  async function onLogout() {
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      /* ignore */
    }
    logout();
    navigate("/login");
  }

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Workforce Management
          </Typography>
          <IconButton color="inherit" onClick={() => navigate("/notifications")}>
            <Badge badgeContent={unread} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>{user?.email[0]?.toUpperCase()}</Avatar>
            <Box>
              <Typography variant="body2">{user?.email}</Typography>
              <Typography variant="caption">{user?.role}</Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <List>
          {items.map((item) => (
            <ListItemButton key={item.to} component={Link} to={item.to} selected={location.pathname === item.to}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <List>
          <ListItemButton onClick={onLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sign out" />
          </ListItemButton>
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
