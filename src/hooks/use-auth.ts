import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "admin" | "tester" | "user";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setRoles([]); return; }
    // Self-heal: if locked super-admin lost their roles, re-grant them
    supabase.rpc("ensure_locked_owner_roles" as any).then(() => {
      supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
        setRoles((data ?? []).map(r => r.role as AppRole));
      });
    });
  }, [user?.id]);

  return {
    session, user, roles, loading,
    isStaff: roles.some(r => r === "owner" || r === "admin" || r === "tester"),
    isAdmin: roles.some(r => r === "owner" || r === "admin"),
    isOwner: roles.includes("owner"),
    signOut: () => supabase.auth.signOut(),
  };
}
