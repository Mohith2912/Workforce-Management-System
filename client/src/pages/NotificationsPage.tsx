import { List, ListItem, ListItemText, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/notifications")).data });
  const read = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <>
      <Typography variant="h4" gutterBottom>Notifications</Typography>
      <List>
        {(data ?? []).map((n: { id: string; title: string; body: string; read: boolean; createdAt: string }) => (
          <ListItem key={n.id} onClick={() => !n.read && read.mutate(n.id)} sx={{ bgcolor: n.read ? "transparent" : "action.hover", cursor: "pointer" }}>
            <ListItemText primary={n.title} secondary={`${n.body} · ${new Date(n.createdAt).toLocaleString()}`} />
          </ListItem>
        ))}
      </List>
    </>
  );
}
