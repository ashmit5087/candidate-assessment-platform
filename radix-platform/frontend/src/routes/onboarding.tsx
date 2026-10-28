import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileUp, Loader2, Sparkles, UploadCloud, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/radix/ui";
import {
  parseResume,
  createProfile,
  resumeToProfile,
  SERVICES,
  type ResumeExtract,
} from "@/lib/radix/services";
import { setSavedProfileId, setSavedProfile } from "@/lib/radix/session";
import { CATEGORY_LABELS, type CandidateProfile, type SkillCategory } from "@/lib/radix/contracts";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — RADIX" },
      { name: "description", content: "Import a resume to begin." },
      { property: "og:title", content: "Get started — RADIX" },
      { property: "og:description", content: "Set up your RADIX candidate profile." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [parseState, setParseState] = useState<"idle" | "parsing" | "parsed" | "saving" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [parseErr, setParseErr] = useState("");
  const [extractedResume, setExtractedResume] = useState<ResumeExtract | null>(null);
  const [candidateName, setCandidateName] = useState("Candidate");
  const fileInput = useRef<HTMLInputElement>(null);

  const resumeServiceReady = !!SERVICES.find((s) => s.key === "resume")?.baseUrl;
  const profileServiceReady = !!SERVICES.find((s) => s.key === "profile")?.baseUrl;

  async function importResume(f: File | undefined) {
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) {
      setParseErr("Please choose a PDF or DOCX file.");
      setParseState("error");
      return;
    }

    setParseState("parsing");
    setStatusMessage("Role 2 parsing resume with Groq LLM...");
    setParseErr("");

    try {
      // 1. Parse with Role 2
      const result: ResumeExtract = await parseResume(f);
      setExtractedResume(result);

      // 2. Guess candidate name from filename
      let name = "Candidate";
      const stem = result.source_file.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      const words = stem.split(" ").filter((w) => /^[A-Za-z]+$/.test(w));
      if (words.length >= 2) {
        name = words
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      } else if (words.length === 1) {
        name = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
      }
      setCandidateName(name);

      setParseState("parsed");
    } catch (e) {
      setParseErr((e as Error).message);
      setParseState("error");
    }
  }

  async function proceedToWorkspace() {
    if (!extractedResume) {
      await navigate({ to: "/app" });
      return;
    }

    setParseState("saving");
    setStatusMessage("Saving profile to Role 3...");

    try {
      const emailHandle = candidateName.toLowerCase().replace(/\s+/g, ".");
      const candidateEmail = `${emailHandle}@candidate.radix`;

      const personalInfo = {
        full_name: candidateName,
        email: candidateEmail,
        location: null,
        summary: null,
      };

      const payload = resumeToProfile(extractedResume, personalInfo);
      let savedProfileId = `candidate-${Date.now()}`;

      if (profileServiceReady) {
        try {
          const resp = await createProfile(payload);
          savedProfileId = resp.profile_id;
        } catch (saveError) {
          console.warn("Could not save to Role 3 Profile Builder, continuing with session store:", saveError);
        }
      }

      setSavedProfileId(savedProfileId);

      const liveProfile: CandidateProfile = {
        profile_id: savedProfileId,
        full_name: personalInfo.full_name,
        headline: personalInfo.summary ?? "Candidate Profile",
        location: undefined,
        education: extractedResume.education ? [{ institution: extractedResume.education, degree: "", year: "" }] : [],
        skills: payload.skills.map((s) => ({
          name: s.skill_name,
          category: s.category_code as CandidateProfile["skills"][0]["category"],
          confidence: s.confidence,
          evidence: s.evidence,
          source: s.source,
        })),
        projects: (extractedResume.projects || []).map((p) => ({ title: p, description: "", tech: [] })),
        experience: (extractedResume.experience || []).map((e) => ({ role: e, company: "", duration: "" })),
        certifications: extractedResume.certifications || [],
        preferred_roles: [],
        created_at: new Date().toISOString().slice(0, 10),
      };

      setSavedProfile(liveProfile);
      await navigate({ to: "/app" });
    } catch (e) {
      setParseErr((e as Error).message);
      setParseState("error");
    }
  }

  return (
    <div className="workspace min-h-screen bg-background text-foreground">
      <div className="relative mx-auto max-w-3xl px-5 py-12">
        <Link to="/"><Wordmark /></Link>

        {/* ── View 1: Initial method picker ── */}
        {(parseState === "idle" || parseState === "parsing" || parseState === "error") && (
          <div className="mt-14 animate-page">
            <h1 className="font-display text-4xl md:text-5xl">How would you like to begin?</h1>
            <p className="mt-3 text-muted-foreground">
              Drop your resume to automatically extract your skills and launch your career workspace.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {/* Resume import */}
              {resumeServiceReady ? (
                <button
                  disabled={parseState === "parsing"}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void importResume(e.dataTransfer.files[0]);
                  }}
                  className="surface group relative p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary disabled:opacity-75"
                >
                  {parseState === "parsing" ? (
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  ) : (
                    <UploadCloud className="h-7 w-7 text-primary transition-transform group-hover:scale-105" />
                  )}

                  <h3 className="font-display mt-6 text-2xl font-semibold">Import a resume</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {parseState === "parsing"
                      ? statusMessage
                      : "Drop a PDF or DOCX file to instantly parse your skills."}
                  </p>

                  {parseState === "error" && (
                    <p className="mt-3 text-xs text-destructive">{parseErr}</p>
                  )}

                  <span className="mt-5 inline-block rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                    Role 2 connected
                  </span>
                </button>
              ) : (
                <div className="surface p-6 opacity-60">
                  <FileUp className="h-7 w-7 text-primary" />
                  <h3 className="font-display mt-6 text-2xl font-semibold">Import a resume</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Set <code>VITE_RESUME_API_URL</code> in <code>.env</code> to enable resume parsing.
                  </p>
                  <span className="mt-5 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                    Not connected
                  </span>
                </div>
              )}

              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => void importResume(e.target.files?.[0])}
              />

              {/* Direct workspace entry */}
              <Link
                to="/app"
                className="surface group p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary flex flex-col justify-between"
              >
                <div>
                  <Sparkles className="h-7 w-7 text-primary transition-transform group-hover:scale-105" />
                  <h3 className="font-display mt-6 text-2xl font-semibold">Explore workspace</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Jump straight into the candidate workspace with demo data and assessments.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-primary">
                  Enter workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ── View 2: Extracted Skills Showcase ── */}
        {(parseState === "parsed" || parseState === "saving") && extractedResume && (
          <div className="mt-12 animate-page">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-success">
                Resume Parsed Successfully by Role 2
              </span>
            </div>

            <h1 className="font-display mt-3 text-3xl md:text-4xl">
              Welcome, {candidateName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Extracted <strong className="text-foreground">{extractedResume.skills.length} skills</strong> from{" "}
              <code>{extractedResume.source_file}</code>:
            </p>

            {/* Visual Skill Badges Showcase */}
            <div className="surface mt-6 p-6">
              <div className="flex flex-wrap gap-2">
                {extractedResume.skills.map((s, idx) => {
                  const catLabel = CATEGORY_LABELS[s.category_code as SkillCategory] || s.category_code;
                  return (
                    <div
                      key={`${s.skill_name}-${idx}`}
                      className="group relative inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm shadow-xs transition-colors hover:border-primary/50"
                    >
                      <span className="font-medium text-foreground">{s.skill_name}</span>
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {catLabel}
                      </span>
                      {s.confidence === "high" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-success" title="High confidence evidence" />
                      )}
                    </div>
                  );
                })}
              </div>

              {extractedResume.education && (
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Education detected:</span> {extractedResume.education}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setParseState("idle")}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Upload a different resume
              </button>

              <Button
                size="lg"
                disabled={parseState === "saving"}
                onClick={() => void proceedToWorkspace()}
                className="gap-2"
              >
                {parseState === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving profile...
                  </>
                ) : (
                  <>
                    Enter Workspace <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
