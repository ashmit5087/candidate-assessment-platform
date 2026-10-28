import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Check, FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/radix/ui";
import { demoProfile } from "@/lib/radix/mock";
import { analyzeJD, runMatch, getImprovementPlan, SERVICES, type JDAnalysis, type MatchRequest } from "@/lib/radix/services";
import type { AssessmentRecord } from "@/lib/radix/contracts";
import { cn } from "@/lib/utils";

import { setLatestLiveAssessment } from "@/lib/radix/session";

export const Route = createFileRoute("/app/assessments/new")({
  head: () => ({
    meta: [
      { title: "New assessment — RADIX" },
      { name: "description", content: "Compare a candidate profile with a job description." },
      { property: "og:title", content: "New assessment — RADIX" },
      { property: "og:description", content: "Run a new skill match." },
    ],
  }),
  component: NewAssessment,
});

type UploadState = "idle" | "uploading" | "done" | "error";
type RunState = "idle" | "running" | "done" | "error";

function NewAssessment() {
  const navigate = useNavigate();

  // Step 1 — Profile
  const [profileSelected, setProfileSelected] = useState(false);

  // Step 2 — JD
  const [file, setFile] = useState<File | null>(null);
  const [jdResult, setJdResult] = useState<JDAnalysis | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadErr, setUploadErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Step 3 — Options
  const [includeTalentCheck, setIncludeTalentCheck] = useState(false);

  // Step 4 — Run match
  const [runState, setRunState] = useState<RunState>("idle");
  const [runErr, setRunErr] = useState("");

  const jdServiceReady = !!SERVICES.find((s) => s.key === "jd")?.baseUrl;
  const matchServiceReady = !!SERVICES.find((s) => s.key === "match")?.baseUrl;

  async function pickFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) {
      setUploadErr("Please choose a PDF or DOCX file.");
      setUploadState("error");
      return;
    }
    setFile(f);
    setUploadState("uploading");
    setUploadErr("");
    setJdResult(null);
    try {
      const { data } = await analyzeJD(f);
      setJdResult(data);
      setUploadState("done");
    } catch (e) {
      setUploadErr((e as Error).message);
      setUploadState("error");
    }
  }

  async function runAssessment() {
    if (!jdResult || !profileSelected) return;
    setRunState("running");
    setRunErr("");
    try {
      const candidateSkills = demoProfile.skills.map((s) => ({
        skill_name: s.name,
        category_code: s.category,
        evidence: s.evidence ?? "",
        confidence: s.confidence,
      }));
      const req: MatchRequest = {
        candidate: { skills: candidateSkills },
        job_description: jdResult,
        talent_check: null,
      };
      const [match, plan] = await Promise.all([
        runMatch(req),
        getImprovementPlan(req),
      ]);
      const record: AssessmentRecord = {
        id: `live-${Date.now()}`,
        role: jdResult.role ?? "Unknown role",
        company: jdResult.company ?? "Unknown company",
        jd_file: jdResult.source_file,
        updated_at: new Date().toISOString().slice(0, 10),
        status: "complete",
        match,
        plan,
      };
      setLatestLiveAssessment(record);
      setRunState("done");
      await navigate({ to: "/app/assessments/$assessmentId", params: { assessmentId: record.id } });
    } catch (e) {
      setRunErr((e as Error).message);
      setRunState("error");
    }
  }

  const ready = profileSelected && uploadState === "done" && matchServiceReady;
  const missing = [
    !profileSelected && "choose a profile",
    uploadState !== "done" && "analyse a job description",
    !matchServiceReady && "configure VITE_MATCH_API_URL",
  ].filter(Boolean).join(", ");

  return (
    <div>
      <PageHeader eyebrow="New assessment" title="Two inputs. One clear picture." />

      {/* Service warnings */}
      {!jdServiceReady && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          JD Analytics (Role 1) is not configured — set <code>VITE_JD_API_URL</code> in{" "}
          <code>.env</code>.
        </div>
      )}
      {!matchServiceReady && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Skill Matching (Role 5) is not configured — set <code>VITE_MATCH_API_URL</code> in{" "}
          <code>.env</code>.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Step 1 — Profile */}
        <section className="surface p-8">
          <p className="text-sm text-muted-foreground">Step 1</p>
          <h2 className="font-display mt-1 text-xl">Candidate profile</h2>
          <button
            onClick={() => setProfileSelected((v) => !v)}
            className={cn(
              "mt-6 flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-colors",
              profileSelected ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40"
            )}
          >
            <div>
              <p className="font-medium">{demoProfile.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {demoProfile.skills.length} skills · demo profile
              </p>
            </div>
            {profileSelected && <Check className="h-5 w-5 text-primary" />}
          </button>
          <Link to="/onboarding" className="mt-4 inline-block text-sm text-primary">
            Create another profile
          </Link>
          <p className="mt-6 text-xs text-muted-foreground">
            Your email is never sent to the matching service.
          </p>
        </section>

        {/* Step 2 — JD upload */}
        <section className="surface p-8">
          <p className="text-sm text-muted-foreground">Step 2</p>
          <h2 className="font-display mt-1 text-xl">Job description</h2>
          <button
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void pickFile(e.dataTransfer.files[0]); }}
            className="mt-6 flex w-full flex-col items-center rounded-2xl border border-dashed border-input p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            {uploadState === "uploading"
              ? <Loader2 className="h-8 w-8 animate-spin text-primary" />
              : uploadState === "done"
              ? <FileText className="h-8 w-8 text-primary" />
              : <UploadCloud className="h-8 w-8 text-primary" />}
            <p className="mt-3 font-medium">
              {file ? file.name : "Drop a PDF or DOCX"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {uploadState === "uploading"
                ? "Uploading → Role 1 extracting requirements…"
                : "Scanned image-only PDFs aren't supported."}
            </p>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => void pickFile(e.target.files?.[0])}
          />
          {uploadState === "done" && jdResult && (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-sm">
              <p className="font-medium text-success">Extracted {jdResult.skills.length} skills</p>
              {jdResult.role && <p className="text-muted-foreground mt-1">{jdResult.role} · {jdResult.company}</p>}
            </div>
          )}
          {uploadState === "error" && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {uploadErr}
            </p>
          )}
        </section>
      </div>

      {/* Step 3 — Run */}
      <div className="surface mt-6 flex flex-col gap-5 p-8 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={includeTalentCheck}
            onChange={(e) => setIncludeTalentCheck(e.target.checked)}
            disabled
            className="h-4 w-4 accent-primary"
          />
          Include Talent Check context{" "}
          <span className="text-muted-foreground">(configure VITE_TALENT_API_URL to enable)</span>
        </label>
        <div className="flex flex-col items-start gap-2 md:items-end">
          {runState === "error" && (
            <p className="text-xs text-destructive max-w-xs text-right">{runErr}</p>
          )}
          <Button
            size="lg"
            disabled={!ready || runState === "running"}
            onClick={() => void runAssessment()}
          >
            {runState === "running" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {runState === "running" ? "Running…" : "Run skill match"}
          </Button>
          {!ready && runState !== "running" && (
            <p className="text-xs text-muted-foreground">To continue, {missing}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
