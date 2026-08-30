import { Button, Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";

export function ApprovalsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["pending-leaves"], queryFn: async () => (await api.get("/leaves/pending")).data });
  const { data: regs } = useQuery({ queryKey: ["pending-regs"], queryFn: async () => (await api.get("/attendance/regularization/pending")).data });
  const [comments, setComments] = useState("Approved");

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api.patch(`/leaves/${id}/${action}`, { comments }),
    onSuccess: () => void qc.invalidateQueries(),
  });
  const decideReg = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api.patch(`/attendance/regularization/${id}/${action}`, { comments }),
    onSuccess: () => void qc.invalidateQueries(),
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Approvals</Typography>
      <TextField label="Comments" value={comments} onChange={(e) => setComments(e.target.value)} />
      <Card>
        <CardContent>
          <Typography variant="h6">Leave</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Days</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {(data ?? []).map((a: { id: string; leaveRequest: { id: string; days: number; startDate: string; endDate: string; leaveType: { name: string }; employee: { firstName: string; lastName: string } } }) => (
                <TableRow key={a.id}>
                  <TableCell>{a.leaveRequest.employee.firstName} {a.leaveRequest.employee.lastName}</TableCell>
                  <TableCell>{a.leaveRequest.leaveType.name}</TableCell>
                  <TableCell>{a.leaveRequest.startDate.slice(0, 10)} → {a.leaveRequest.endDate.slice(0, 10)}</TableCell>
                  <TableCell>{a.leaveRequest.days}</TableCell>
                  <TableCell>
                    <Button onClick={() => decide.mutate({ id: a.leaveRequest.id, action: "approve" })}>Approve</Button>
                    <Button color="error" onClick={() => decide.mutate({ id: a.leaveRequest.id, action: "reject" })}>Reject</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Attendance regularization</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {(regs ?? []).map((r: { id: string; workDate: string; reason: string; employee: { firstName: string; lastName: string } }) => (
                <TableRow key={r.id}>
                  <TableCell>{r.employee.firstName} {r.employee.lastName}</TableCell>
                  <TableCell>{r.workDate.slice(0, 10)}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>
                    <Button onClick={() => decideReg.mutate({ id: r.id, action: "approve" })}>Approve</Button>
                    <Button color="error" onClick={() => decideReg.mutate({ id: r.id, action: "reject" })}>Reject</Button>
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
