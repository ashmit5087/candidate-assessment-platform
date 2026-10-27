import { request } from './apiClient';
import type { ProfileSkill } from './profileBuilderClient';
import type { JDAnalysis } from './jdAnalyticsClient';
const base = import.meta.env.VITE_SKILL_MATCH_API_BASE_URL ?? '';
export type MatchRequest = { candidate: { skills: ProfileSkill[] }; job_description: JDAnalysis; talent_check: null };
export type MatchSkill = {
  skill_name?: string;
  category_code?: string;
  status?: string;
  critical_gap?: boolean;
  rationale?: string;
  jd_evidence?: string | null;
  candidate_evidence?: string | null;
  candidate_skill?: string | null;
  [key: string]: unknown;
};
export type ImprovementAction = {
  title?: string;
  skill_name?: string;
  score_gain?: number;
  projected_score_after?: number;
  steps?: unknown[];
  why?: string;
  level_needed?: number | string;
  [key: string]: unknown;
};
export type MatchResult = {
  match_score: number; summary: string; missing_skills: MatchSkill[]; partial_matches: MatchSkill[]; review_required: MatchSkill[]; matched_skills: MatchSkill[];
  score_breakdown?: { formula?: string; [key: string]: unknown };
  disclaimer: string; warnings?: string[]; algorithm_version?: string; jd_source_file?: string;
  improvement_plan?: { actions?: ImprovementAction[] };
  [key: string]: unknown;
};
export type ImprovementPlanRequest = Omit<MatchRequest, 'use_llm'> & { use_llm?: boolean };
export const skillMatchingClient = {
  baseUrl: base,
  health: () => request<{ status?: string }>(base, '/health'),
  match: (payload: MatchRequest) => request<MatchResult>(base, '/api/v1/matches', { method: 'POST', body: JSON.stringify(payload) }),
  improvementPlan: (payload: ImprovementPlanRequest) => request<{ actions: ImprovementAction[] }>(base, '/api/v1/improvement-plan', { method: 'POST', body: JSON.stringify(payload) }),
};
