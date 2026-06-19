import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: ManageUsers });

const ROLES = ["tester", "admin", "owner"] as const;

function ManageUsers() {
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, discord_id, discord_username, discord_avatar").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const byUser = new Map<string, string[]>();
      (roles ?? []).forEach(r => byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]));
      return (profiles ?? []).map(p => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  const grant = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role granted"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Users & roles</h1>
      <Card className="divide-y divide-border">
        {users?.map(u => (
          <div key={u.id} className="flex items-center gap-4 p-4">
            {u.discord_avatar && <img src={u.discord_avatar} className="h-10 w-10 rounded-full" alt="" />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{u.discord_username ?? "(no name)"}</div>
              <div className="text-xs text-muted-foreground font-mono">{u.discord_id}</div>
              <div className="text-xs mt-1 flex gap-1 flex-wrap">{u.roles.map(r => <span key={r} className="px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">{r}</span>)}</div>
            </div>
            <div className="flex gap-1">
              {ROLES.map(r => (
                u.roles.includes(r)
                  ? <Button key={r} size="sm" variant="destructive" onClick={() => revoke.mutate({ user_id: u.id, role: r })}>− {r}</Button>
                  : <Button key={r} size="sm" variant="outline" onClick={() => grant.mutate({ user_id: u.id, role: r })}>+ {r}</Button>
              ))}
            </div>
          </div>
        ))}
        {(!users || users.length === 0) && <div className="p-8 text-center text-muted-foreground text-sm">No users yet. Sign in once to create your owner profile.</div>}
      </Card>
    </div>
  );
}
