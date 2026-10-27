# Role 5 integration notes

Run: `cd apps/skill_matching && uv run uvicorn skill_matching.api:app --port 8005`.

Agreement points to confirm with Roles 1 and 3 (see spec section 11):
1. JD skills array key is `skills`; each skill has `skill_name`, `category_code`, `evidence`, `confidence`.
2. Role 1 supplies `source_file`, `company`, `role`.
3. Role 3 supplies candidate `skills` in the same shape.
4. Request wraps them as `candidate` and `job_description` (otherwise add an adapter in `service.parse_inputs`).
5. Dependency manager (uv here), port (8005) and folder (`apps/skill_matching`) are agreed.

Output always retains `jd_source_file`, `match_score`, `matched_skills`, `missing_skills`.
Role 5 does not depend on Role 4's Talent Check score.
