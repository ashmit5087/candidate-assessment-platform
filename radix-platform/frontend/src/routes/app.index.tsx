import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowUpRight, FileUp, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LevelBar, ScoreRing } from "@/components/radix/ui";
import { getSavedProfile, getLatestLiveAssessment, hasSavedProfile } from "@/lib/radix/session";
import type { CandidateProfile, AssessmentRecord } from "@/lib/radix/contracts";

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
  const [profile, setProfile] = useState<CandidateProfile>(getSavedProfile());
  const [liveAssessment, setLiveAssessment] = useState<AssessmentRecord | null>(getLatestLiveAssessment());

  useEffect(() => {
    setProfile(getSavedProfile());
    setLiveAssessment(getLatestLiveAssessment());
  }, []);

  const isCustomProfile = hasSavedProfile();
  const firstName = isCustomProfile && profile.full_name ? profile.full_name.split(" ")[0] : "there";

  const completenessPercent = isCustomProfile
    ? Math.min(100, Math.round(20 + (profile.full_name ? 20 : 0) + (profile.skills.length > 0 ? 30 : 0) + (profile.headline ? 15 : 0) + (profile.location ? 15 : 0)))
    : 0;

  const latest = liveAssessment;
  const allAssessments: AssessmentRecord[] = liveAssessment ? [liveAssessment] : [];

  return (
    <div>
      <div className="mb-10">
        <p className="text-sm text-muted-foreground">Good evening, {firstName}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-[34px]">
          Build the next version of <span className="font-[Instrument_Serif] font-normal italic">you.</span>
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          One place to see your skills, compare them with real roles, and choose what to work on next.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        {latest ? (
          <Link
            to="/app/assessments/$assessmentId"
            params={{ assessmentId: latest.id }}
            className="surface group p-6 transition-shadow hover:shadow-md md:p-8"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted-foreground">Your latest live assessment</p>
              <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                Live Result
              </span>
            </div>
            <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-center">
              <ScoreRing score={latest.match.match_score} size={150} />
              <div>
                <h2 className="text-xl font-semibold">{latest.role}</h2>
                <p className="text-sm text-muted-foreground">{latest.company}</p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed">{latest.match.summary}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                  View assessment details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="surface p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <Sparkles className="h-4 w-4" /> Ready to assess
              </div>
              <h2 className="mt-3 text-xl font-semibold">No assessments completed yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                Upload a job description to measure your skills against enterprise standards and generate a customized step-by-step improvement plan.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/app/assessments/new">
                  <FileUp className="mr-2 h-4 w-4" /> Start your first assessment
                </Link>
              </Button>
              {!isCustomProfile && (
                <Button asChild variant="outline">
                  <Link to="/onboarding">
                    <UserRound className="mr-2 h-4 w-4" /> Import resume
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col border-l-2 border-gold pl-6 justify-between">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">Recommended next step</p>
            <h3 className="mt-2 text-lg font-semibold">
              {latest?.plan?.actions?.[0]
                ? `Level up ${latest.plan.actions[0].skill}`
                : isCustomProfile
                ? "Run your first skill match"
                : "Upload your resume"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {latest?.plan?.actions?.[0]?.why ??
                (isCustomProfile
                  ? "Compare your profile against any job description to discover matched skills and growth areas."
                  : "Start by parsing your resume to automatically extract verified skills, education, and projects.")}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {latest ? (
              <>
                <Button asChild><Link to="/app/skill-growth">View improvement plan</Link></Button>
                <Button asChild variant="outline"><Link to="/app/assessments/new"><FileUp className="mr-1 h-4 w-4" /> Analyze a JD</Link></Button>
              </>
            ) : isCustomProfile ? (
              <Button asChild><Link to="/app/assessments/new"><FileUp className="mr-1 h-4 w-4" /> Analyze a JD</Link></Button>
            ) : (
              <Button asChild><Link to="/onboarding"><UserRound className="mr-1 h-4 w-4" /> Get started</Link></Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent assessments</h3>
            <Link to="/app/assessments" className="text-sm text-muted-foreground hover:text-foreground">See all</Link>
          </div>
          {allAssessments.length === 0 ? (
            <div className="border-t border-border py-8 text-center text-sm text-muted-foreground">
              No recent assessments. Run an assessment to see your history here.
            </div>
          ) : (
            allAssessments.slice(0, 4).map((a) => (
              <Link key={a.id} to="/app/assessments/$assessmentId" params={{ assessmentId: a.id }}
                className="flex items-center justify-between border-t border-border py-3.5 transition-colors hover:bg-secondary/40">
                <div>
                  <p className="text-[15px] font-medium">{a.role}</p>
                  <p className="text-sm text-muted-foreground">{a.company} · {a.updated_at}</p>
                </div>
                <span className="text-lg font-semibold tabular-nums">
                  {a.match.match_score}<span className="text-xs font-normal text-muted-foreground">/100</span>
                </span>
              </Link>
            ))
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">Profile</h3>
            <span className="text-sm font-semibold tabular-nums">{completenessPercent}%</span>
          </div>
          <div className="mt-3"><LevelBar value={completenessPercent} max={100} /></div>
          <p className="mt-3 text-xs text-muted-foreground">
            {isCustomProfile
              ? `${profile.skills.length} skills recorded in your active profile.`
              : "No profile loaded. Import a resume to track your profile completeness."}
          </p>
          <Link to="/app/profile" className="mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline">
            View profile <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/app/skill-growth" className="mt-8 block border-t border-border pt-4 text-sm text-muted-foreground hover:text-foreground">
            Skill Growth — small steps, stronger evidence →
          </Link>
        </section>
      </div>
    </div>
  );
}
