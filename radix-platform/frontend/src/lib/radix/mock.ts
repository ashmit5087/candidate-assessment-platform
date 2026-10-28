import type { AssessmentRecord, CandidateProfile, Completeness, Opportunity } from "./contracts";

// Clean blank profile structure for new projects
export const emptyProfile: CandidateProfile = {
  profile_id: "",
  full_name: "",
  headline: "",
  location: "",
  education: [],
  skills: [],
  projects: [],
  experience: [],
  certifications: [],
  preferred_roles: [],
  created_at: "",
};

export const demoProfile: CandidateProfile = emptyProfile;

export const emptyCompleteness: Completeness = {
  percent: 0,
  sections: [
    { key: "personal", label: "Personal info", complete: false },
    { key: "education", label: "Education", complete: false },
    { key: "skills", label: "Skills", complete: false },
    { key: "projects", label: "Projects", complete: false },
    { key: "experience", label: "Experience", complete: false },
    { key: "certifications", label: "Certifications", complete: false },
    { key: "preferred", label: "Preferred roles", complete: false },
  ],
};

export const demoCompleteness: Completeness = emptyCompleteness;

// Clean slate: no pre-stored assessments
export const demoAssessments: AssessmentRecord[] = [];

// Clean slate: no pre-stored opportunities
export const demoOpportunities: Opportunity[] = [];
