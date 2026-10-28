import type { AssessmentRecord, CandidateProfile } from "./contracts";
import { demoProfile } from "./mock";

// ── Profile ID ────────────────────────────────────────────────────────────────
const PROFILE_ID_KEY = "radix_profile_id";
const PROFILE_DATA_KEY = "radix_profile_data";
const ASSESSMENT_KEY = "radix_latest_assessment";

export function getSavedProfileId(): string | null {
  return sessionStorage.getItem(PROFILE_ID_KEY);
}

export function setSavedProfileId(id: string | null) {
  if (id) sessionStorage.setItem(PROFILE_ID_KEY, id);
  else sessionStorage.removeItem(PROFILE_ID_KEY);
}

// ── Full profile data (built from onboarding parse result) ────────────────────

export function getSavedProfile(): CandidateProfile {
  try {
    const raw = sessionStorage.getItem(PROFILE_DATA_KEY);
    if (raw) return JSON.parse(raw) as CandidateProfile;
  } catch {
    // fall through
  }
  return demoProfile; // fallback to demo if no real profile saved yet
}

export function setSavedProfile(profile: CandidateProfile) {
  sessionStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(profile));
}

export function hasSavedProfile(): boolean {
  return !!sessionStorage.getItem(PROFILE_DATA_KEY);
}

// ── Latest live assessment ────────────────────────────────────────────────────

export function getLatestLiveAssessment(): AssessmentRecord | null {
  try {
    const raw = sessionStorage.getItem(ASSESSMENT_KEY);
    return raw ? (JSON.parse(raw) as AssessmentRecord) : null;
  } catch {
    return null;
  }
}

export function setLatestLiveAssessment(record: AssessmentRecord | null) {
  if (record) sessionStorage.setItem(ASSESSMENT_KEY, JSON.stringify(record));
  else sessionStorage.removeItem(ASSESSMENT_KEY);
}
