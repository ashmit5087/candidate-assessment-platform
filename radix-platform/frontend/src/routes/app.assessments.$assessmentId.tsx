import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronDown } from "lucide-react";
import { ScoreRing, SkillRow } from "@/components/radix/ui";
import { ACTION_LABELS, CATEGORY_LABELS, type SkillCategory } from "@/lib/radix/contracts";
import { getLatestLiveAssessment, getSavedProfile } from "@/lib/radix/session";
import type { AssessmentRecord } from "@/lib/radix/contracts";

export const Route = createFileRoute("/app/assessments/$assessmentId")({
  loader: ({ params }): AssessmentRecord => {
    // Check live assessment (from the current session run)
    const latest = getLatestLiveAssessment();
    if (latest && params.assessmentId === latest.id) {
      return latest;
    }
    throw notFound();
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.role} at ${loaderData.company} — RADIX` : "Assessment — RADIX" },
      { name: "description", content: "Skill-match estimate, gaps and improvement plan." },
      { property: "og:title", content: loaderData ? `${loaderData.role} — skill match` : "Assessment" },
      { property: "og:description", content: "Skill-match estimate and improvement plan." },
    ],
  }),
  notFoundComponent: () => (
    <div className="py-24 text-center">
      <h1 className="font-display text-3xl">Assessment not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">No assessment with this identifier exists in this workspace.</p>
      <Link to="/app/assessments" className="mt-6 inline-block text-primary hover:underline">
        Back to assessments
      </Link>
    </div>
  ),
  component: Results,
});

function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="surface px-8 py-6">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between"
      >
        <h2 className="font-display text-xl">
          {title} <span className="ml-2 text-base text-muted-foreground">{count}</span>
        </h2>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}

function Results() {
  const a = Route.useLoaderData();
  const m = a.match;
  const profile = getSavedProfile();
  const candidateName = profile.full_name || "Candidate";
  const gaps = [...m.missing_skills].sort((x, y) => Number(!!y.critical_gap) - Number(!!x.critical_gap));

  return (
    <div className="space-y-6">
      <Link
        to="/app/assessments"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Assessments
      </Link>

      <div className="surface relative overflow-hidden p-8 md:p-10">
        <div className="relative flex flex-col gap-10 md:flex-row md:items-center">
          <ScoreRing score={m.match_score} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{m.jd_source_file}</span>
              <span>·</span>
              <span>{candidateName}</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                Live result
              </span>
            </div>
            <h1 className="font-display mt-3 text-3xl md:text-[34px] leading-tight">{m.role}</h1>
            <p className="text-lg text-muted-foreground">{m.company}</p>
            <p className="mt-5 max-w-2xl leading-relaxed">{m.summary}</p>
          </div>
        </div>
      </div>

      {m.warnings.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-sm">
          {m.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      <Section title="Gaps to close" count={gaps.length}>
        {gaps.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No critical skill gaps identified.</p>
        ) : (
          gaps.map((s) => <SkillRow key={s.skill} item={s} />)
        )}
      </Section>

      <Section title="Matched skills" count={m.matched_skills.length} defaultOpen={false}>
        {m.matched_skills.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No directly matched skills found.</p>
        ) : (
          m.matched_skills.map((s) => <SkillRow key={s.skill} item={s} />)
        )}
      </Section>

      {m.partial_matches.length > 0 && (
        <Section title="Partial matches" count={m.partial_matches.length} defaultOpen={false}>
          {m.partial_matches.map((s) => <SkillRow key={s.skill} item={s} />)}
        </Section>
      )}

      {m.review_required.length > 0 && (
        <Section title="Review required" count={m.review_required.length} defaultOpen={false}>
          {m.review_required.map((s) => <SkillRow key={s.skill} item={s} />)}
        </Section>
      )}

      {a.plan && (
        <div className="surface p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl">Actionable improvement path</h2>
            <Link to="/app/skill-growth" className="text-sm text-primary hover:underline">
              Open interactive plan →
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {a.plan.actions.map((act, i) => (
              <div key={act.skill} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-semibold">{act.skill}</span>
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {ACTION_LABELS[act.action_type]}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-success">+{act.score_gain} pts</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{act.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
