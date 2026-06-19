import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const userId = (context as any).user?.id;
    if (!userId) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map(r => r.role);
    if (!roles.some(r => r === "owner" || r === "admin" || r === "tester")) {
      throw redirect({ to: "/" });
    }
    return { roles };
  },
  component: AdminShell,
});

const NAV = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/tiers", label: "Tiers" },
  { to: "/admin/gamemodes", label: "Gamemodes", adminOnly: true },
  { to: "/admin/users", label: "Users & Roles", adminOnly: true },
  { to: "/admin/bot", label: "Discord Bot", adminOnly: true },
] as const;

function AdminShell() {
  const { roles } = Route.useRouteContext();
  const isAdmin = roles.some(r => r === "owner" || r === "admin");
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 grid md:grid-cols-[220px_1fr] gap-6">
        <aside>
          <Card className="p-2 pixel-border">
            <nav className="flex flex-col gap-1">
              {NAV.filter(n => !n.adminOnly || isAdmin).map(n => {
                const active = (n as any).exact ? pathname === n.to : pathname.startsWith(n.to);
                return (
                  <Link key={n.to} to={n.to as any}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </Card>
        </aside>
        <main className="min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}
