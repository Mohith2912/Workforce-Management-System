import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function EmployeesPage() {
  const { data } = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get("/employees")).data });
  return (
    <>
      <Typography variant="h4" gutterBottom>Employee master</Typography>
      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data ?? []).map((e: { id: string; employeeCode: string; firstName: string; lastName: string; designation: string; department?: { name: string }; manager?: { firstName: string; lastName: string } | null; user?: { email: string; role: string } }) => (
                <TableRow key={e.id}>
                  <TableCell>{e.employeeCode}</TableCell>
                  <TableCell>{e.firstName} {e.lastName}</TableCell>
                  <TableCell>{e.user?.email}</TableCell>
                  <TableCell>{e.department?.name}</TableCell>
                  <TableCell>{e.designation}</TableCell>
                  <TableCell>{e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "—"}</TableCell>
                  <TableCell>{e.user?.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
