import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Swords } from "lucide-react";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl flex-nowrap items-center justify-between gap-2 px-4">
        <Link to="/" className="flex min-w-0 shrink items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground glow-primary">
            <Swords className="h-5 w-5" />
          </span>
          <span className="truncate">Archer's<span className="text-primary">Tiers</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/" className="px-3 py-2 rounded-md hover:bg-muted [&.active]:text-primary [&.active]:font-semibold" activeOptions={{ exact: true }}>Home</Link>
          <Link to="/leaderboard" className="px-3 py-2 rounded-md hover:bg-muted [&.active]:text-primary">Leaderboard</Link>
          <Link to="/matches" className="px-3 py-2 rounded-md hover:bg-muted [&.active]:text-primary">Matches</Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin"><Shield className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Admin</span></Link>
            </Button>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Button asChild size="sm" className="whitespace-nowrap bg-[#5865F2] hover:bg-[#4752c4] text-white">
              <Link to="/auth"><span className="sm:hidden">Login</span><span className="hidden sm:inline">Login with Discord</span></Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
