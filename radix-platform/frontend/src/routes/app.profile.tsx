import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, MapPin, Pencil, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoTag, LevelBar } from "@/components/radix/ui";
import { CATEGORY_LABELS, type SkillCategory } from "@/lib/radix/contracts";
import { demoCompleteness, demoProfile as p } from "@/lib/radix/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — RADIX" },
      { name: "description", content: "Your skills, projects and experience in one record." },
      { property: "og:title", content: "My Profile — RADIX" },
      { property: "og:description", content: "Candidate profile." },
    ],
  }),
  component: Profile,
});

const TABS = ["About", "Skills", "Projects & experience", "Education", "Certifications", "Preferences"] as const;

function Profile() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Skills");
  const groups = p.skills.reduce<Record<string, typeof p.skills>>((acc, s) => ((acc[s.category] ??= []).push(s), acc), {});
  return (
    <div>
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3"><h1 className="font-display text-3xl md:text-[34px] leading-tight">{p.full_name}</h1><DemoTag /></div>
          <p className="mt-2 text-muted-foreground">{p.headline}</p>
          {p.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{p.location}</p>}
        </div>
        <div className="flex gap-2"><Button variant="outline"><Pencil /> Edit profile</Button><Button><Upload /> Upload CV</Button></div>
      </div>

      <div className="mb-8 rounded-xl bg-secondary/60 p-5">
        <div className="flex items-baseline justify-between"><p className="font-medium">Your profile is {demoCompleteness.percent}% complete</p><p className="text-xs text-muted-foreground">Completeness tracks profile information, not your job-match score.</p></div>
        <div className="mt-4"><LevelBar value={demoCompleteness.percent} max={100} /></div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {demoCompleteness.sections.map((s) => <span key={s.key} className={cn("flex items-center gap-1.5", s.complete ? "text-foreground" : "text-muted-foreground")}>{s.complete ? <Check className="h-3.5 w-3.5 text-success" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground" />}{s.label}</span>)}
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors", tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{t}</button>)}
      </div>

      {tab === "Skills" && (
        <div className="divide-y divide-border">
          {Object.entries(groups).map(([cat, skills]) => (
            <div key={cat} className="py-6 first:pt-2">
              <h3 className="text-[17px] font-semibold">{CATEGORY_LABELS[cat as SkillCategory]}</h3>
              {skills.map((s) => (
                <div key={s.name} className="mt-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between"><span className="font-medium">{s.name}</span><span className="flex gap-1.5 text-xs"><span className="rounded-md bg-gold-soft px-2 py-0.5">{s.confidence} confidence</span><span className="rounded-md bg-secondary px-2 py-0.5 text-muted-foreground">Source: {s.source}</span></span></div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.evidence ?? <em>No evidence provided</em>}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {tab === "About" && <div className="surface p-6 leading-relaxed">{p.headline}. Preferred roles: {p.preferred_roles.join(", ")}.</div>}
      {tab === "Projects & experience" && (
        <div className="grid gap-4 md:grid-cols-2">
          {p.projects.map((x) => <div key={x.title} className="surface p-6"><h3 className="text-base font-semibold">{x.title}</h3><p className="mt-2 text-sm text-muted-foreground">{x.summary}</p></div>)}
          {p.experience.map((x) => <div key={x.company} className="surface p-6"><h3 className="text-base font-semibold">{x.title}</h3><p className="mt-2 text-sm text-muted-foreground">{x.company} · {x.period}</p></div>)}
        </div>
      )}
      {tab === "Education" && p.education.map((e) => <div key={e.institution} className="surface p-6"><h3 className="text-base font-semibold">{e.degree}</h3><p className="text-sm text-muted-foreground">{e.institution} · {e.year}</p></div>)}
      {tab === "Certifications" && <div className="surface p-6 text-muted-foreground">No certifications yet. Adding one completes this section.</div>}
      {tab === "Preferences" && <div className="surface flex flex-wrap gap-2 p-6">{p.preferred_roles.map((r) => <span key={r} className="rounded-full bg-secondary px-3 py-1 text-sm">{r}</span>)}</div>}
    </div>
  );
}
