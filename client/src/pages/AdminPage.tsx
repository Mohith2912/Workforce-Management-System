import { Button, Card, CardContent, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";

export function AdminPage() {
  const qc = useQueryClient();
  const { data: types } = useQuery({ queryKey: ["leave-types"], queryFn: async () => (await api.get("/leaves/types")).data });
  const { data: holidays } = useQuery({ queryKey: ["holidays"], queryFn: async () => (await api.get("/holidays")).data });
  const { data: audit } = useQuery({ queryKey: ["audit"], queryFn: async () => (await api.get("/audit-logs")).data });
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [location, setLocation] = useState("ALL");

  const addHoliday = useMutation({
    mutationFn: async () => api.post("/holidays", { date: holidayDate, name: holidayName, location }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["holidays"] }),
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Admin</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">Leave policies</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Quota</TableCell>
                <TableCell>Accrual / month</TableCell>
                <TableCell>Carry-forward max</TableCell>
                <TableCell>Probation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(types ?? []).map((t: { id: string; name: string; policy?: { annualQuota: number; accrualPerMonth: number; carryForwardMax: number; probationEligible: boolean } }) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.policy?.annualQuota}</TableCell>
                  <TableCell>{t.policy?.accrualPerMonth}</TableCell>
                  <TableCell>{t.policy?.carryForwardMax}</TableCell>
                  <TableCell>{t.policy?.probationEligible ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button onClick={() => api.post("/jobs/accrual")}>Run monthly accrual</Button>
            <Button onClick={() => api.post("/jobs/payroll")}>Generate payroll snapshots</Button>
            <Button onClick={() => api.post("/jobs/carry-forward")}>Year-end carry-forward</Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Holidays</Typography>
          <Stack direction="row" spacing={2} sx={{ my: 2 }}>
            <TextField label="Name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} />
            <TextField type="date" label="Date" slotProps={{ inputLabel: { shrink: true } }} value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
            <TextField select label="Location" value={location} onChange={(e) => setLocation(e.target.value)} sx={{ minWidth: 120 }}>
              <MenuItem value="ALL">ALL</MenuItem>
              <MenuItem value="HQ">HQ</MenuItem>
              <MenuItem value="BLR">BLR</MenuItem>
            </TextField>
            <Button variant="contained" onClick={() => addHoliday.mutate()}>Add</Button>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(holidays ?? []).map((h: { id: string; date: string; name: string; location: string }) => (
                <TableRow key={h.id}>
                  <TableCell>{h.date.slice(0, 10)}</TableCell>
                  <TableCell>{h.name}</TableCell>
                  <TableCell>{h.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Audit log</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(audit ?? []).slice(0, 50).map((a: { id: string; createdAt: string; action: string; entity: string; user?: { email: string } | null }) => (
                <TableRow key={a.id}>
                  <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{a.user?.email ?? "system"}</TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell>{a.entity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
