import { Button, Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";

export function ReportsPage() {
  const qc = useQueryClient();
  const { data: payroll } = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => (await api.get("/reports/payroll-summary")).data,
  });
  const { data: trends } = useQuery({
    queryKey: ["leave-trends"],
    queryFn: async () => (await api.get("/reports/leave-trends")).data as { byMonth: number[] },
  });
  const { data: attendance } = useQuery({
    queryKey: ["team-att"],
    queryFn: async () => (await api.get("/reports/team-attendance")).data,
  });

  const chart = (trends?.byMonth ?? []).map((v, i) => ({ month: i + 1, days: v }));

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Reports</Typography>
      <Button
        variant="contained"
        sx={{ width: 260 }}
        onClick={async () => {
          await api.get("/reports/payroll-summary?generate=true");
          void qc.invalidateQueries({ queryKey: ["payroll"] });
        }}
      >
        Recalculate payroll snapshot
      </Button>
      <Card>
        <CardContent>
          <Typography variant="h6">Payroll input (from attendance + approved leave)</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Working days</TableCell>
                <TableCell>Present</TableCell>
                <TableCell>Paid leave</TableCell>
                <TableCell>LOP</TableCell>
                <TableCell>Late</TableCell>
                <TableCell>OT min</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(payroll ?? []).map((p: { id: string; workingDays: number; presentDays: number; paidLeaveDays: number; lopDays: number; lateCount: number; overtimeMinutes: number; employee: { firstName: string; lastName: string } }) => (
                <TableRow key={p.id}>
                  <TableCell>{p.employee.firstName} {p.employee.lastName}</TableCell>
                  <TableCell>{p.workingDays}</TableCell>
                  <TableCell>{p.presentDays}</TableCell>
                  <TableCell>{p.paidLeaveDays}</TableCell>
                  <TableCell>{p.lopDays}</TableCell>
                  <TableCell>{p.lateCount}</TableCell>
                  <TableCell>{p.overtimeMinutes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ height: 320 }}>
          <Typography variant="h6">Approved leave days by month</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="days" fill="#1565c0" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Team attendance</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(attendance ?? []).slice(0, 40).map((l: { id: string; status: string; workDate: string; employee: { firstName: string; lastName: string } }) => (
                <TableRow key={l.id}>
                  <TableCell>{l.employee.firstName} {l.employee.lastName}</TableCell>
                  <TableCell>{l.workDate.slice(0, 10)}</TableCell>
                  <TableCell>{l.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
