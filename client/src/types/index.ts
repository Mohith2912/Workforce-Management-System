export type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate: string;
  location: string;
  department?: { id: string; name: string };
  manager?: { firstName: string; lastName: string } | null;
  user?: { email: string; role: Role };
  shift?: { name: string; startTime: string; endTime: string } | null;
};

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  employee: Employee | null;
};
