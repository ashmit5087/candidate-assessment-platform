import type { AssessmentRecord } from "./contracts";

let _savedProfileId: string | null = null;
let _latestLiveAssessment: AssessmentRecord | null = null;

export function getSavedProfileId(): string | null {
  return _savedProfileId;
}

export function setSavedProfileId(id: string | null) {
  _savedProfileId = id;
}

export function getLatestLiveAssessment(): AssessmentRecord | null {
  return _latestLiveAssessment;
}

export function setLatestLiveAssessment(record: AssessmentRecord | null) {
  _latestLiveAssessment = record;
}
