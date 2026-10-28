import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { DemoTag, PageHeader } from "@/components/radix/ui";
import { ACTION_LABELS } from "@/lib/radix/contracts";
import { demoAssessments } from "@/lib/radix/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/skill-growth")({
  head: () => ({
    meta: [
      { title: "Skill Growth — RADIX" },
      { name: "description", content: "Small steps. Stronger evidence. Your prioritized learning path." },
      { property: "og:title", content: "Skill Growth — RADIX" },
      { property: "og:description", content: "Your prioritized learning path." },
    ],
  }),
  component: SkillGrowth,
});

function SkillGrowth() {
  const a = demoAssessments[0]!;
  const plan = a.plan;
  const [done, setDone] = useState<string[]>([]);
  return (
    <div>
      <PageHeader eyebrow={`Focus: ${a.role} · ${a.company}`} title={<>Small steps. <em className="text-amber-gradient">Stronger evidence.</em></>} />

      <section className="mb-10 border-b border-border pb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Projected path</h2><span className="flex items-center gap-2 text-xs text-muted-foreground">Estimate, not a prediction <DemoTag /></span></div>
        <div className="relative mt-8 h-1.5 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-sky" style={{ width: `${plan.current_score}%` }} />
          {plan.actions.map((x, i) => (
            <div key={x.skill} className="absolute -top-1.5 flex -translate-x-1/2 flex-col items-center" style={{ left: `${x.projected_score_after}%` }}>
              <span className="h-4 w-4 rounded-full border-2 border-gold bg-card" />
              <span className="mt-2 text-[11px] tabular-nums text-muted-foreground">{i + 1} · {x.projected_score_after}</span>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">Now <span className="font-semibold tabular-nums text-foreground">{plan.current_score}</span> · each marker shows the estimated score after that step.</p>
      </section>

      <ol className="divide-y divide-border">
        {plan.actions.map((x, i) => {
          const d = done.includes(x.skill);
          return (
            <li key={x.skill} className={cn("py-7 transition-opacity first:pt-0", d && "opacity-60")}>
              <div className="flex flex-wrap items-start gap-5">
                <span className="font-display text-3xl md:text-[34px] leading-tight leading-none text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[17px] font-semibold">{x.skill}</h3>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-accent-foreground">{ACTION_LABELS[x.action_type]}</span>
                    {x.level_needed != null && <span className="text-xs text-muted-foreground">Level needed {x.level_needed}/5</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{x.why}</p>
                  <ul className="mt-4 space-y-2 text-sm">{x.steps.map((s) => <li key={s} className="flex gap-3"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />{s}</li>)}</ul>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums text-success">+{x.score_gain} est.</p>
                  <p className="text-xs text-muted-foreground">→ {x.projected_score_after}</p>
                  <button onClick={() => setDone((v) => d ? v.filter((s) => s !== x.skill) : [...v, x.skill])}
                    className={cn("mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs", d ? "border-success text-success" : "border-border text-muted-foreground hover:text-foreground")}>
                    <Check className="h-3 w-3" /> {d ? "Done" : "Mark done"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-muted-foreground">"Mark done" is saved only on this screen for now. {plan.disclaimer}</p>
    </div>
  );
}
