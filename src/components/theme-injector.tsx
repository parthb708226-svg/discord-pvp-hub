import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveThemeFn } from "@/lib/theme.functions";

export function ThemeInjector() {
  const fn = useServerFn(getActiveThemeFn);
  const { data } = useQuery({
    queryKey: ["active-theme"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
  const vars = (data?.vars ?? {}) as Record<string, string>;
  const css = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join("");
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: `:root{${css}}` }} />;
}
