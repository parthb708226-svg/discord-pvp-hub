import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function pub() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getActiveThemeFn = createServerFn({ method: "GET" }).handler(async () => {
  const sb = pub();
  const { data: s } = await sb.from("site_settings").select("active_theme_id").eq("id", "main").maybeSingle();
  const id = s?.active_theme_id ?? "deepslate";
  const { data: t } = await sb.from("site_themes").select("id, name, vars").eq("id", id).maybeSingle();
  return t ?? { id: "deepslate", name: "Deepslate Cave", vars: {} as Record<string, string> };
});

export const listThemesFn = createServerFn({ method: "GET" }).handler(async () => {
  const sb = pub();
  const { data } = await sb.from("site_themes").select("id, name, category, vars, sort_order").order("sort_order");
  return data ?? [];
});

export const setActiveThemeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("Owner only");
    const { error } = await context.supabase.from("site_settings").update({ active_theme_id: data.id, updated_at: new Date().toISOString() }).eq("id", "main");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
