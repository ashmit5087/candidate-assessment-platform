import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoTag, LevelBar, ScoreRing } from "@/components/radix/ui";
import { demoAssessments, demoCompleteness, demoProfile } from "@/lib/radix/mock";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Home — RADIX workspace" },
      { name: "description", content: "Pick up where you left off and take the next useful step." },
      { property: "og:title", content: "Home — RADIX workspace" },
      { property: "og:description", content: "Your candidate workspace home." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const latest = demoAssessments[0]!;
  return (
    <div>
      <div className="mb-10">
        <p className="text-sm text-muted-foreground">Good evening, {demoProfile.full_name.split(" ")[0]}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-[34px]">Build the next version of <span className="font-[Instrument_Serif] font-normal italic">you.</span></h1>
        <p className="mt-3 max-w-xl text-muted-foreground">One place to see your skills, compare them with real roles, and choose what to work on next.</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        <Link to="/app/assessments/$assessmentId" params={{ assessmentId: latest.id }} className="surface group p-6 transition-shadow hover:shadow-md md:p-8">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Continue where you left off</p>
            <DemoTag />
          </div>
          <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-center">
            <ScoreRing score={latest.match.match_score} size={150} />
            <div>
              <h2 className="text-xl font-semibold">{latest.role}</h2>
              <p className="text-sm text-muted-foreground">{latest.company}</p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed">{latest.match.summary}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">View latest assessment <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </div>
        </Link>

        <div className="flex flex-col border-l-2 border-gold pl-6">
          <p className="text-[13px] font-medium text-muted-foreground">Recommended next step</p>
          <h3 className="mt-2 text-lg font-semibold">Close your critical gap</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Distributed system design is marked critical for {latest.company}. One design doc could add ~9 points (estimate).</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild><Link to="/app/skill-growth">View improvement plan</Link></Button>
            <Button asChild variant="outline"><Link to="/app/assessments/new"><FileUp /> Analyze a JD</Link></Button>
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent assessments</h3>
            <Link to="/app/assessments" className="text-sm text-muted-foreground hover:text-foreground">See all</Link>
          </div>
          {demoAssessments.map((a) => (
            <Link key={a.id} to="/app/assessments/$assessmentId" params={{ assessmentId: a.id }}
              className="flex items-center justify-between border-t border-border py-3.5 transition-colors hover:bg-secondary/40">
              <div><p className="text-[15px] font-medium">{a.role}</p><p className="text-sm text-muted-foreground">{a.company} · {a.updated_at}</p></div>
              <span className="text-lg font-semibold tabular-nums">{a.match.match_score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
            </Link>
          ))}
        </section>
        <section>
          <div className="flex items-baseline justify-between"><h3 className="text-lg font-semibold">Profile</h3><span className="text-sm font-semibold tabular-nums">{demoCompleteness.percent}%</span></div>
          <div className="mt-3"><LevelBar value={demoCompleteness.percent} max={100} /></div>
          <p className="mt-3 text-xs text-muted-foreground">Completeness tracks profile information, not your job-match score.</p>
          <Link to="/app/profile" className="mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline">Complete profile <ArrowUpRight className="h-4 w-4" /></Link>
          <Link to="/app/skill-growth" className="mt-8 block border-t border-border pt-4 text-sm text-muted-foreground hover:text-foreground">Skill Growth — small steps, stronger evidence →</Link>
        </section>
      </div>
    </div>
  );
}
