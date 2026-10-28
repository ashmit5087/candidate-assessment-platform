import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, Compass, Cpu, Home, Settings, Sprout, UserRound } from "lucide-react";
import { Wordmark } from "@/components/radix/ui";
import { getSavedProfile, hasSavedProfile } from "@/lib/radix/session";
import type { CandidateProfile } from "@/lib/radix/contracts";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/assessments", label: "Assessments", icon: ClipboardList },
  { to: "/app/opportunities", label: "Opportunities", icon: Compass },
  { to: "/app/profile", label: "My Profile", icon: UserRound },
  { to: "/app/skill-growth", label: "Skill Growth", icon: Sprout },
  { to: "/app/showcase", label: "Role Showcase", icon: Cpu },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppShell() {
  const [profile, setProfile] = useState<CandidateProfile>(getSavedProfile());
  const isSaved = hasSavedProfile();

  useEffect(() => {
    setProfile(getSavedProfile());
  }, []);

  const initials = profile.full_name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="workspace min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="px-6 py-7"><Link to="/" className="text-sidebar-foreground"><Wordmark /></Link></div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex items-center gap-3 relative rounded-lg px-4 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-secondary hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-gold before:opacity-0 data-[status=active]:before:opacity-100 data-[status=active]:text-sidebar-accent-foreground"
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          {isSaved
            ? `Active candidate: ${profile.full_name} (${profile.skills.length} skills loaded)`
            : "Sign-in is a future integration. This workspace shows demo data."}
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-5 py-4 backdrop-blur-md md:px-10">
          <Link to="/" className="lg:hidden"><Wordmark /></Link>
          <p className="hidden text-sm text-muted-foreground lg:block">Candidate workspace</p>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">{profile.full_name}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft text-sm font-semibold text-foreground">{initials || "AM"}</span>
          </div>
        </header>
        <main className="animate-page mx-auto max-w-[1200px] px-5 pb-28 pt-10 md:px-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-full border border-sidebar-border bg-card/95 p-1.5 shadow-lg backdrop-blur lg:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} aria-label={n.label}
            className="rounded-full p-3 text-sidebar-foreground/60 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground">
            <n.icon className="h-5 w-5" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
