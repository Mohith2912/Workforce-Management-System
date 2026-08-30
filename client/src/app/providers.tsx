import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { ReactNode } from "react";

export function DateProvider({ children }: { children: ReactNode }) {
  return <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>;
}
