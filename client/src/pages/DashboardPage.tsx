import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../features/auth/store";

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/employees/me")).data,
  });

  const cards = [
    { label: "Pending approvals", value: data?.approvals ?? 0 },
    { label: "My pending leave", value: data?.myPending ?? 0 },
    { label: "Open leave requests", value: data?.pendingLeaves ?? 0 },
    { label: "Present today", value: data?.presentToday ?? 0 },
    { label: "Headcount", value: data?.employees ?? 0 },
    { label: "Unread alerts", value: data?.unread ?? 0 },
  ];

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4">Dashboard</Typography>
        <Typography color="text.secondary">
          Welcome {me ? `${me.firstName} ${me.lastName}` : user?.email}
        </Typography>
      </div>
      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid key={c.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{c.label}</Typography>
                <Typography variant="h4">{c.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {data?.payroll && (
        <Card>
          <CardContent>
            <Typography variant="h6">This month payroll snapshot</Typography>
            <Typography>
              Present {data.payroll.presentDays} · Paid leave {data.payroll.paidLeaveDays} · LOP {data.payroll.lopDays} · OT{" "}
              {data.payroll.overtimeMinutes} min
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
