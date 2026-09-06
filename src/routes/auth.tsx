import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — PvP Tiers" }] }),
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>): {
    token_hash?: string;
    type?: string;
    error?: string;
    next?: string;
  } => ({
    ...(typeof s.token_hash === "string" ? { token_hash: s.token_hash } : {}),
    ...(typeof s.type === "string" ? { type: s.type } : {}),
    ...(typeof s.error === "string" ? { error: s.error } : {}),
    ...(typeof s.next === "string" ? { next: s.next } : {}),
  }),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("");

  const safeNext = search.next && search.next.startsWith("/") && !search.next.startsWith("//") ? search.next : "";

  // If returning from Discord OAuth callback with a token_hash, finalize the session client-side.
  useEffect(() => {
    if (search.token_hash && search.type === "email") {
      setStatus("Finalizing sign-in...");
      supabase.auth.verifyOtp({ token_hash: search.token_hash, type: "email" }).then(({ error }) => {
        if (error) setStatus("Sign-in failed: " + error.message);
        else if (safeNext) window.location.href = safeNext;
        else navigate({ to: "/" });
      });
    }
  }, [search.token_hash, search.type, safeNext]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 pixel-border">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
        <h1 className="mt-4 text-3xl font-extrabold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use your Discord account. Your roles are tied to your Discord identity.</p>
        {search.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {search.error === "missing_client_id"
              ? "Sign-in isn't configured on this site yet: the Discord app ID is missing from the hosting environment settings."
              : search.error === "bad_state"
                ? "Sign-in expired or was opened in a different browser. Please try again."
                : "Sign-in failed (" + search.error + "). Please try again."}
          </p>
        )}
        <Button asChild className="mt-6 w-full bg-[#5865F2] hover:bg-[#4752c4] text-white h-12 text-base">
          <a href={`/api/auth/discord/start${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2 fill-current"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            Continue with Discord
          </a>
        </Button>
        {status && <p className="mt-4 text-sm text-center text-muted-foreground">{status}</p>}
      </Card>
    </div>
  );
}
