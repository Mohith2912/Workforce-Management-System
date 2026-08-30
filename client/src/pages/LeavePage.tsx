import {
  Alert,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";

export function LeavePage() {
  const qc = useQueryClient();
  const { data: types } = useQuery({ queryKey: ["leave-types"], queryFn: async () => (await api.get("/leaves/types")).data });
  const { data: balances } = useQuery({ queryKey: ["balances"], queryFn: async () => (await api.get("/leaves/balances")).data });
  const { data: mine } = useQuery({ queryKey: ["my-leaves"], queryFn: async () => (await api.get("/leaves/me")).data });
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const apply = useMutation({
    mutationFn: async () => (await api.post("/leaves", { leaveTypeId, startDate, endDate, reason })).data,
    onSuccess: () => {
      setError("");
      setReason("");
      void qc.invalidateQueries();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message ?? "Failed"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => api.patch(`/leaves/${id}/cancel`),
    onSuccess: () => void qc.invalidateQueries(),
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Leave</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">Balances</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Entitled</TableCell>
                <TableCell>Carried</TableCell>
                <TableCell>Pending</TableCell>
                <TableCell>Used</TableCell>
                <TableCell>Available</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(balances ?? []).map((b: { id: string; leaveType: { name: string }; entitled: number; carriedForward: number; pending: number; used: number }) => (
                <TableRow key={b.id}>
                  <TableCell>{b.leaveType.name}</TableCell>
                  <TableCell>{b.entitled}</TableCell>
                  <TableCell>{b.carriedForward}</TableCell>
                  <TableCell>{b.pending}</TableCell>
                  <TableCell>{b.used}</TableCell>
                  <TableCell>{b.entitled + b.carriedForward - b.used - b.pending}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Apply</Typography>
          {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Type" value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} sx={{ minWidth: 200 }}>
              {(types ?? []).map((t: { id: string; name: string }) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField type="date" label="Start" slotProps={{ inputLabel: { shrink: true } }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <TextField type="date" label="End" slotProps={{ inputLabel: { shrink: true } }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ flex: 1 }} />
            <Button variant="contained" onClick={() => apply.mutate()} disabled={!leaveTypeId || !startDate || !endDate}>
              Submit
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">My requests</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {(mine ?? []).map((r: { id: string; leaveType: { name: string }; startDate: string; endDate: string; days: number; status: string }) => (
                <TableRow key={r.id}>
                  <TableCell>{r.leaveType.name}</TableCell>
                  <TableCell>{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}</TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.status === "PENDING" && (
                      <Button size="small" onClick={() => cancel.mutate(r.id)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
