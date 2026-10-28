import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, FileUp, Loader2, PenLine, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/radix/ui";
import {
  parseResume,
  createProfile,
  resumeToProfile,
  SERVICES,
  type ResumeExtract,
} from "@/lib/radix/services";
import { cn } from "@/lib/utils";
import { setSavedProfileId, setSavedProfile } from "@/lib/radix/session";
import type { CandidateProfile } from "@/lib/radix/contracts";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — RADIX" },
      { name: "description", content: "Import a resume or build your profile by hand." },
      { property: "og:title", content: "Get started — RADIX" },
      { property: "og:description", content: "Set up your RADIX candidate profile." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Import or start", "Review details", "Save & continue"] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Personal details form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [headline, setHeadline] = useState("");

  // Resume import flow
  const [extractedResume, setExtractedResume] = useState<ResumeExtract | null>(null);
  const [parseState, setParseState] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [parseErr, setParseErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Save flow
  const [saveState, setSaveState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [saveErr, setSaveErr] = useState("");

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
    setParseErr("");
    try {
      const result = await parseResume(f);
      setExtractedResume(result);
      setParseState("done");

      // ── Pre-fill name from filename heuristic (Role 2 doesn't return name)
      // Try to extract a name from the source_file field e.g. "ananya_rao_resume.pdf"
      if (!name) {
        const stem = result.source_file.replace(/\.[^.]+$/, "").replace(/[_\-]/g, " ");
        const words = stem.split(" ").filter((w) => /^[A-Za-z]+$/.test(w));
        if (words.length >= 2) {
          const guessedName = words
            .slice(0, 2)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
          setName(guessedName);
        }
      }

      setStep(1);
    } catch (e) {
      setParseErr((e as Error).message);
      setParseState("error");
    }
  }

  async function saveProfile() {
    if (!name.trim() || !email.trim()) {
      setSaveErr("Full name and email are required.");
      return;
    }
    setSaveState("saving");
    setSaveErr("");
    const personalInfo = {
      full_name: name.trim(),
      email: email.trim(),
      location: location.trim() || null,
      summary: headline.trim() || null,
    };
    const payload = extractedResume
      ? resumeToProfile(extractedResume, personalInfo)
      : { personal_info: personalInfo, skills: [] };

    try {
      const resp = await createProfile(payload);
      setSavedProfileId(resp.profile_id);

      // Build a CandidateProfile from what we have and save it to session
      const liveProfile: CandidateProfile = {
        profile_id: resp.profile_id,
        full_name: personalInfo.full_name,
        headline: personalInfo.summary ?? "",
        location: personalInfo.location ?? undefined,
        education: [],
        skills: payload.skills.map((s) => ({
          name: s.skill_name,
          category: s.category_code as CandidateProfile["skills"][0]["category"],
          confidence: s.confidence,
          evidence: s.evidence,
          source: s.source,
        })),
        projects: [],
        experience: [],
        certifications: [],
        preferred_roles: [],
        created_at: new Date().toISOString().slice(0, 10),
      };
      setSavedProfile(liveProfile);

      setSaveState("done");
      await navigate({ to: "/app" });
    } catch (e) {
      setSaveErr((e as Error).message);
      setSaveState("error");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden starfield">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-glow" />
      <div className="relative mx-auto max-w-2xl px-5 py-10">
        <Link to="/"><Wordmark /></Link>

        <ol className="mt-14 flex gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <div className={cn("h-1 rounded-full", i <= step ? "bg-amber" : "bg-muted")} />
              <p className={cn("mt-2 text-xs", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</p>
            </li>
          ))}
        </ol>

        {/* ── Step 0: Import method ────────────────────────────── */}
        {step === 0 && (
          <div className="mt-12 animate-page">
            <h1 className="font-display text-5xl">How would you like to begin?</h1>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {/* Resume import */}
              {resumeServiceReady ? (
                <button
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); void importResume(e.dataTransfer.files[0]); }}
                  className="surface p-6 text-left transition-transform hover:-translate-y-0.5 hover:border-primary"
                >
                  {parseState === "parsing"
                    ? <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    : parseState === "done"
                    ? <FileUp className="h-6 w-6 text-success" />
                    : <UploadCloud className="h-6 w-6 text-primary" />}
                  <h3 className="font-display mt-6 text-2xl">Import a resume</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {parseState === "parsing"
                      ? "Parsing with Role 2…"
                      : parseState === "done"
                      ? `Extracted ${extractedResume?.skills.length ?? 0} skills. Click to continue.`
                      : "Drop a PDF or DOCX — Role 2 will prefill your profile."}
                  </p>
                  {parseState === "error" && (
                    <p className="mt-3 text-sm text-destructive">{parseErr}</p>
                  )}
                  <span className="mt-4 inline-block rounded-full bg-success/15 px-3 py-1 text-xs text-success">
                    Role 2 connected
                  </span>
                </button>
              ) : (
                <div className="surface p-6 opacity-60">
                  <FileUp className="h-6 w-6 text-primary" />
                  <h3 className="font-display mt-6 text-2xl">Import a resume</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Set <code>VITE_RESUME_API_URL</code> in <code>.env</code> to enable resume parsing.
                  </p>
                  <span className="mt-4 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
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

              {/* Manual entry */}
              <button
                onClick={() => setStep(1)}
                className="surface p-6 text-left transition-transform hover:-translate-y-0.5 hover:border-primary"
              >
                <PenLine className="h-6 w-6 text-primary" />
                <h3 className="font-display mt-6 text-2xl">Start manually</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your details by hand. Takes about three minutes.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Details form ─────────────────────────────── */}
        {step === 1 && (
          <form
            className="mt-12 animate-page"
            onSubmit={(e) => { e.preventDefault(); if (name.trim() && email.trim()) setStep(2); }}
          >
            <h1 className="font-display text-5xl">The essentials.</h1>
            {extractedResume && (
              <div className="mt-6 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                Imported {extractedResume.skills.length} skills from your resume. Review your details below.
              </div>
            )}
            <label className="mt-8 block text-sm">Full name *
              <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
                placeholder="e.g. Ananya Rao"
                className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="mt-5 block text-sm">Email *
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200}
                placeholder="e.g. ananya@example.com"
                className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="mt-5 block text-sm">Location
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} placeholder="City, country"
                className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="mt-5 block text-sm">Headline
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={160}
                placeholder="e.g. Final-year CS student, aspiring backend engineer"
                className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <div className="mt-8 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button type="submit">Continue <ArrowRight /></Button>
            </div>
          </form>
        )}

        {/* ── Step 2: Save ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="mt-12 animate-page">
            <h1 className="font-display text-5xl">Ready, {name.split(" ")[0]}.</h1>
            {profileServiceReady ? (
              <>
                <p className="mt-4 text-muted-foreground">
                  Click below to save your profile to the Profile Builder service (Role 3).
                  {extractedResume && ` ${extractedResume.skills.length} skills from your resume will be included.`}
                </p>
                {saveState === "error" && (
                  <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {saveErr}
                  </p>
                )}
                <div className="mt-8 flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    disabled={saveState === "saving"}
                    onClick={() => void saveProfile()}
                  >
                    {saveState === "saving" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {saveState === "saving" ? "Saving…" : "Save & enter workspace"}
                    {saveState !== "saving" && <ArrowRight />}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-muted-foreground">
                  The Profile Builder service isn't connected — set <code>VITE_PROFILE_API_URL</code> in{" "}
                  <code>.env</code> to save profiles. You can explore the workspace with demo data for now.
                </p>
                <div className="mt-8 flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button asChild><Link to="/app">Enter workspace <ArrowRight /></Link></Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
