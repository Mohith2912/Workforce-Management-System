import { Button, Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";

export function AttendancePage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["attendance"], queryFn: async () => (await api.get("/attendance/me")).data });
  const { data: regs } = useQuery({ queryKey: ["my-regs"], queryFn: async () => (await api.get("/attendance/regularization/me")).data });
  const [workDate, setWorkDate] = useState("");
  const [requestedIn, setRequestedIn] = useState("");
  const [requestedOut, setRequestedOut] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  const punch = useMutation({
    mutationFn: async (kind: "check-in" | "check-out") => (await api.post(`/attendance/${kind}`)).data,
    onSuccess: (row) => {
      setMsg(`${row.status} · ${row.workMinutes} min worked`);
      void qc.invalidateQueries();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => setMsg(err.response?.data?.message ?? "Failed"),
  });

  const regularize = useMutation({
    mutationFn: async () =>
      api.post("/attendance/regularization", {
        workDate,
        requestedIn: requestedIn ? new Date(requestedIn).toISOString() : undefined,
        requestedOut: requestedOut ? new Date(requestedOut).toISOString() : undefined,
        reason,
      }),
    onSuccess: () => void qc.invalidateQueries(),
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Attendance</Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={() => punch.mutate("check-in")}>Check in</Button>
        <Button variant="outlined" onClick={() => punch.mutate("check-out")}>Check out</Button>
        {msg && <Typography>{msg}</Typography>}
      </Stack>
      <Card>
        <CardContent>
          <Typography variant="h6">Recent logs</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>In</TableCell>
                <TableCell>Out</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Late</TableCell>
                <TableCell>OT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data ?? []).map((l: { id: string; workDate: string; checkIn: string | null; checkOut: string | null; status: string; lateMinutes: number; overtimeMinutes: number }) => (
                <TableRow key={l.id}>
                  <TableCell>{l.workDate.slice(0, 10)}</TableCell>
                  <TableCell>{l.checkIn ? new Date(l.checkIn).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell>{l.checkOut ? new Date(l.checkOut).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell>{l.status}</TableCell>
                  <TableCell>{l.lateMinutes}</TableCell>
                  <TableCell>{l.overtimeMinutes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Regularization</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField type="date" label="Date" slotProps={{ inputLabel: { shrink: true } }} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            <TextField type="datetime-local" label="Requested in" slotProps={{ inputLabel: { shrink: true } }} value={requestedIn} onChange={(e) => setRequestedIn(e.target.value)} />
            <TextField type="datetime-local" label="Requested out" slotProps={{ inputLabel: { shrink: true } }} value={requestedOut} onChange={(e) => setRequestedOut(e.target.value)} />
            <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="contained" onClick={() => regularize.mutate()}>Submit</Button>
          </Stack>
          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(regs ?? []).map((r: { id: string; workDate: string; status: string; reason: string }) => (
                <TableRow key={r.id}>
                  <TableCell>{r.workDate.slice(0, 10)}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
