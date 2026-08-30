import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../features/auth/store";

export function LoginPage() {
  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();
  const [email, setEmail] = useState("jane@wms.local");
  const [password, setPassword] = useState("Employee@123");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setSession(data.user, data.accessToken, data.refreshToken);
      navigate("/");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Login failed");
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#0f172a" }}>
      <Card sx={{ width: 420 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Workforce login
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Demo: jane@wms.local / Employee@123 · manager@wms.local / Manager@123 · admin@wms.local / Admin@123
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
              <Button type="submit" variant="contained" size="large">
                Sign in
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
