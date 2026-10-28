import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, MapPin, Pencil, Upload, UserRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LevelBar } from "@/components/radix/ui";
import { CATEGORY_LABELS, type SkillCategory, type CandidateProfile } from "@/lib/radix/contracts";
import { getSavedProfile, hasSavedProfile } from "@/lib/radix/session";
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

const TABS = ["Skills", "About", "Projects & experience", "Education", "Certifications", "Preferences"] as const;

const PROFILE_SECTIONS = [
  { key: "personal", label: "Personal info" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "experience", label: "Experience" },
  { key: "certifications", label: "Certifications" },
  { key: "preferred", label: "Preferred roles" },
] as const;

function Profile() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Skills");
  const [profile, setProfile] = useState<CandidateProfile>(getSavedProfile());
  const isCustom = hasSavedProfile();

  useEffect(() => {
    setProfile(getSavedProfile());
  }, []);

  const p = profile;
  const groups = p.skills.reduce<Record<string, typeof p.skills>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const sectionStatus: Record<string, boolean> = {
    personal: !!p.full_name,
    education: p.education.length > 0,
    skills: p.skills.length > 0,
    projects: p.projects.length > 0,
    experience: p.experience.length > 0,
    certifications: p.certifications.length > 0,
    preferred: p.preferred_roles.length > 0,
  };

  const completedCount = Object.values(sectionStatus).filter(Boolean).length;
  const completenessPercent = isCustom ? Math.round((completedCount / PROFILE_SECTIONS.length) * 100) : 0;

  return (
    <div>
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl md:text-[34px] leading-tight">
              {p.full_name || "New Candidate"}
            </h1>
            {isCustom ? (
              <span className="rounded-full bg-success/15 px-3 py-1 text-xs text-success font-medium">
                Active profile ({p.skills.length} skills)
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground font-medium">
                No profile saved
              </span>
            )}
          </div>
          <p className="mt-2 text-muted-foreground">{p.headline || "Import a resume to automatically construct your profile."}</p>
          {p.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />{p.location}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/onboarding"><Pencil className="mr-2 h-4 w-4" /> {isCustom ? "Update resume" : "Import resume"}</Link>
          </Button>
        </div>
      </div>

      <div className="mb-8 rounded-xl bg-secondary/60 p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Your profile is {completenessPercent}% complete</p>
          <p className="text-xs text-muted-foreground">Completeness tracks profile sections populated from your CV.</p>
        </div>
        <div className="mt-4"><LevelBar value={completenessPercent} max={100} /></div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {PROFILE_SECTIONS.map((s) => {
            const isSectionDone = sectionStatus[s.key] ?? false;
            return (
              <span key={s.key} className={cn("flex items-center gap-1.5", isSectionDone ? "text-foreground" : "text-muted-foreground")}>
                {isSectionDone ? <Check className="h-3.5 w-3.5 text-success" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground" />}
                {s.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors",
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t} {t === "Skills" && `(${p.skills.length})`}
          </button>
        ))}
      </div>

      {tab === "Skills" && (
        <div className="divide-y divide-border">
          {Object.keys(groups).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No skills recorded yet.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/onboarding"><Upload className="mr-2 h-4 w-4" /> Upload resume to extract skills</Link>
              </Button>
            </div>
          ) : (
            Object.entries(groups).map(([cat, skills]) => (
              <div key={cat} className="py-6 first:pt-2">
                <h3 className="text-[17px] font-semibold">{CATEGORY_LABELS[cat as SkillCategory] ?? cat}</h3>
                {skills.map((s) => (
                  <div key={s.name} className="mt-4 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.name}</span>
                      <span className="flex gap-1.5 text-xs">
                        <span className="rounded-md bg-gold-soft px-2 py-0.5">{s.confidence} confidence</span>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-muted-foreground">Source: {s.source ?? "extracted"}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.evidence ?? <em>Extracted from resume</em>}</p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "About" && (
        <div className="py-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Full Name</h3>
            <p className="mt-1 font-medium">{p.full_name || "—"}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Location</h3>
            <p className="mt-1">{p.location || "—"}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Summary / Headline</h3>
            <p className="mt-1">{p.headline || "—"}</p>
          </div>
        </div>
      )}

      {tab === "Projects & experience" && (
        <div className="py-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold">Projects</h3>
            {p.projects.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No projects listed yet.</p>
            ) : (
              p.projects.map((proj) => (
                <div key={proj.title} className="mt-3 rounded-lg border border-border p-4">
                  <h4 className="font-medium">{proj.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{proj.summary}</p>
                </div>
              ))
            )}
          </section>
          <section>
            <h3 className="text-lg font-semibold">Experience</h3>
            {p.experience.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No experience entries listed yet.</p>
            ) : (
              p.experience.map((exp) => (
                <div key={exp.company} className="mt-3 rounded-lg border border-border p-4">
                  <h4 className="font-medium">{exp.title} · {exp.company}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{exp.period}</p>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {tab === "Education" && (
        <div className="py-6 space-y-3">
          {p.education.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education entries listed yet.</p>
          ) : (
            p.education.map((edu) => (
              <div key={edu.institution} className="rounded-lg border border-border p-4">
                <h4 className="font-medium">{edu.degree}</h4>
                <p className="text-sm text-muted-foreground">{edu.institution} · {edu.year}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Certifications" && (
        <div className="py-6">
          {p.certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certifications listed yet.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm space-y-1">
              {p.certifications.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
        </div>
      )}

      {tab === "Preferences" && (
        <div className="py-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Preferred Roles</h3>
          {p.preferred_roles.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No preferences specified.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {p.preferred_roles.map((r) => (
                <span key={r} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
