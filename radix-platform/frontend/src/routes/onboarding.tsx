import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileUp, Loader2, Sparkles, UploadCloud } from "lucide-react";
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
import type { CandidateProfile } from "@/lib/radix/contracts";

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
  const [parseState, setParseState] = useState<"idle" | "parsing" | "saving" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [parseErr, setParseErr] = useState("");
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
    setStatusMessage("Parsing resume with Role 2...");
    setParseErr("");

    try {
      // 1. Parse with Role 2
      const result: ResumeExtract = await parseResume(f);
      setStatusMessage(`Extracted ${result.skills.length} skills. Saving profile...`);
      setParseState("saving");

      // 2. Guess candidate name from filename
      let candidateName = "Candidate";
      const stem = result.source_file.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      const words = stem.split(" ").filter((w) => /^[A-Za-z]+$/.test(w));
      if (words.length >= 2) {
        candidateName = words
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      } else if (words.length === 1) {
        candidateName = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
      }

      // Generate a clean candidate email identifier to satisfy backend requirements
      const emailHandle = candidateName.toLowerCase().replace(/\s+/g, ".");
      const candidateEmail = `${emailHandle}@candidate.radix`;

      const personalInfo = {
        full_name: candidateName,
        email: candidateEmail,
        location: null,
        summary: null,
      };

      const payload = resumeToProfile(result, personalInfo);

      let savedProfileId = `candidate-${Date.now()}`;

      // 3. Persist to Role 3 if connected
      if (profileServiceReady) {
        try {
          const resp = await createProfile(payload);
          savedProfileId = resp.profile_id;
        } catch (saveError) {
          console.warn("Could not save to Role 3 Profile Builder, continuing with session store:", saveError);
        }
      }

      setSavedProfileId(savedProfileId);

      // 4. Save CandidateProfile to active session
      const liveProfile: CandidateProfile = {
        profile_id: savedProfileId,
        full_name: personalInfo.full_name,
        headline: personalInfo.summary ?? "Candidate Profile",
        location: undefined,
        education: result.education ? [{ institution: result.education, degree: "", year: "" }] : [],
        skills: payload.skills.map((s) => ({
          name: s.skill_name,
          category: s.category_code as CandidateProfile["skills"][0]["category"],
          confidence: s.confidence,
          evidence: s.evidence,
          source: s.source,
        })),
        projects: (result.projects || []).map((p) => ({ title: p, description: "", tech: [] })),
        experience: (result.experience || []).map((e) => ({ role: e, company: "", duration: "" })),
        certifications: result.certifications || [],
        preferred_roles: [],
        created_at: new Date().toISOString().slice(0, 10),
      };

      setSavedProfile(liveProfile);
      setParseState("done");
      setStatusMessage("Profile ready! Entering workspace...");

      // 5. Jump straight to the workspace
      await navigate({ to: "/app" });
    } catch (e) {
      setParseErr((e as Error).message);
      setParseState("error");
    }
  }

  return (
    <div className="workspace min-h-screen bg-background text-foreground">
      <div className="relative mx-auto max-w-2xl px-5 py-12">
        <Link to="/"><Wordmark /></Link>

        <div className="mt-14 animate-page">
          <h1 className="font-display text-4xl md:text-5xl">How would you like to begin?</h1>
          <p className="mt-3 text-muted-foreground">
            Drop your resume to automatically extract your skills and launch your career workspace.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* Resume import */}
            {resumeServiceReady ? (
              <button
                disabled={parseState === "parsing" || parseState === "saving"}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void importResume(e.dataTransfer.files[0]);
                }}
                className="surface group relative p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary disabled:opacity-75 disabled:pointer-events-none"
              >
                {parseState === "parsing" || parseState === "saving" ? (
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                ) : parseState === "done" ? (
                  <CheckCircle2 className="h-7 w-7 text-success" />
                ) : (
                  <UploadCloud className="h-7 w-7 text-primary transition-transform group-hover:scale-105" />
                )}

                <h3 className="font-display mt-6 text-2xl font-semibold">Import a resume</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {parseState === "parsing" || parseState === "saving"
                    ? statusMessage
                    : parseState === "done"
                    ? "Profile initialized. Redirecting..."
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
      </div>
    </div>
  );
}
