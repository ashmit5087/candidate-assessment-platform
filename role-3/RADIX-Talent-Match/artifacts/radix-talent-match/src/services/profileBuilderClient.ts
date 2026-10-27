import { request } from './apiClient';
const base = import.meta.env.VITE_PROFILE_API_BASE_URL ?? '';
export type ProfileSkill = { skill_name: string; category_code: string; evidence: string; confidence: 'high' | 'medium' | 'low' };
export type Profile = { profile_id: string; display_name: string; personal_details?: Record<string, unknown>; education?: unknown[]; skills: ProfileSkill[]; projects?: unknown[]; experience?: unknown[]; certifications?: unknown[]; preferred_roles?: string[]; completeness?: { score: number; sections: unknown[] } };
// Contract is intentionally gated until the backend Pydantic request and response models are confirmed.
export const profileBuilderClient = {
  baseUrl: base,
  health: () => request<{ status?: string }>(base, '/health'),
  get: (id: string) => request<Profile>(base, `/api/v1/profiles/${encodeURIComponent(id)}`),
  getSkills: (id: string) => request<ProfileSkill[]>(base, `/api/v1/profiles/${encodeURIComponent(id)}/skills`),
  completeness: (id: string) => request<Profile['completeness']>(base, `/api/v1/profiles/${encodeURIComponent(id)}/completeness`),
  create: (): never => { throw new Error('Profile save is disabled: request and response contract not confirmed.'); },
  update: (): never => { throw new Error('Profile save is disabled: request and response contract not confirmed.'); },
};
