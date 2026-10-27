import { request } from './apiClient';
const base = import.meta.env.VITE_JD_API_BASE_URL ?? '';
export type Skill = { skill_name: string; category_code: string; evidence: string | null; confidence: 'high' | 'medium' | 'low' };
export type JDAnalysis = { jd_id: string; source_type: string; source_file: string; company?: string; role?: string; skills: Skill[]; [key: string]: unknown };
export const jdAnalyticsClient = {
  baseUrl: base,
  health: () => request<{ status?: string }>(base, '/health'),
  list: () => request<JDAnalysis[]>(base, '/api/v1/jds'),
  get: (id: string) => request<JDAnalysis>(base, `/api/v1/jds/${encodeURIComponent(id)}`),
  skills: (id: string) => request<Skill[]>(base, `/api/v1/jds/${encodeURIComponent(id)}/skills`),
  analyze: (file: File) => { const body = new FormData(); body.append('file', file); return request<JDAnalysis>(base, '/api/v1/jds/analyze', { method: 'POST', body }); },
  updateSkills: (id: string, skills: Skill[]) => request<unknown>(base, `/api/v1/jds/${encodeURIComponent(id)}/skills`, { method: 'PATCH', body: JSON.stringify({ skills }) }),
  remove: (id: string) => request<unknown>(base, `/api/v1/jds/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  search: (query: string, top_k = 5) => request<unknown[]>(base, '/api/v1/jds/search', { method: 'POST', body: JSON.stringify({ query, top_k }) }),
};
