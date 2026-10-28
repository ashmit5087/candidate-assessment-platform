import type { AssessmentRecord, CandidateProfile } from "./contracts";
import { emptyProfile } from "./mock";

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
    if (raw) {
      const parsed = JSON.parse(raw) as CandidateProfile;
      if (parsed && (parsed.full_name || parsed.skills?.length > 0)) {
        return parsed;
      }
    }
  } catch {
    // fall through
  }
  return emptyProfile;
}

export function setSavedProfile(profile: CandidateProfile) {
  sessionStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(profile));
}

export function hasSavedProfile(): boolean {
  try {
    const raw = sessionStorage.getItem(PROFILE_DATA_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as CandidateProfile;
    return !!(parsed && (parsed.full_name || parsed.skills?.length > 0));
  } catch {
    return false;
  }
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
