# Role 5 - Skill Matching

Compares one candidate's skills with **one** extracted JD skill list (Role 1 output) and returns a
0-100 score plus matched / partial / needs-review / missing skills, each with a rationale.
Deterministic, offline, no LLM, no API keys. No UI (Role 3 owns that).

## Setup (uv)
```bash
cd apps/skill_matching
uv sync --extra dev
uv run pytest -q
```

## CLI
```bash
uv run python -m skill_matching.cli --candidate data/sample_candidate.json --jd data/sample_jd.json
uv run python -m skill_matching.cli --candidate data/sample_candidate_data.json --jd data/sample_jd_data_role.json --format json
```
Exit codes: `0` ok, `2` invalid input (message on stderr), `1` unexpected error.

## API
```bash
uv run uvicorn skill_matching.api:app --host 127.0.0.1 --port 8005
curl -X POST http://127.0.0.1:8005/api/v1/matches -H "Content-Type: application/json" --data-binary @data/sample_match_request.json
```
| Method | Path | Purpose |
|---|---|---|
| GET | `/health`, `/` | liveness, endpoint pointers |
| POST | `/api/v1/matches` | score one `candidate` against one `job_description` |
| POST | `/api/v1/matches/preview` | per-requirement classification, no score |

Request: `{"candidate": {...skills[]}, "job_description": {source_file, company, role, skills[]}}`.
Required response fields: `jd_source_file`, `match_score`, `matched_skills`, `missing_skills`.
Additive: `partial_matches`, `review_required`, `score_breakdown`, `summary`, `algorithm_version`, `warnings`.
Errors: `400` invalid JSON/contract, `422` JD with no skills, `500` generic message (no traces).
Machine-readable contract: `../../contracts/role5_skill_matching.schema.json`.

## How scoring works
`score = 100 * (matched_weight + 0.5 * partial_weight) / total_required_weight`.
Every JD skill weighs 1.0 unless it carries an optional `importance`. The denominator is the JD's
requirements only, so extra or duplicate candidate skills never raise the score. Each JD requirement
counts once.

Classification order (first hit wins): exact -> approved alias -> composite (data structures +
algorithms = DSA) -> related skill (partial) -> whole-word phrase overlap (partial) -> ambiguous
(`review_required`, 0 points) -> missing. A candidate skill extracted with `low` confidence is
never counted; it becomes `review_required`. All alias/relation tables live in
`src/skill_matching/aliases.py` so reviewers can challenge them.

## Known limitations
- Alias/relation tables are hand-curated and small; unlisted synonyms are reported missing.
- Only the `skills` array is matched; projects/internships/certifications are not mined.
- No proficiency levels; upstream `confidence` is evidence quality, not skill level.
- Fixtures in `data/` are **synthetic**, not official hackathon data. Drop the official pack into
  `data/` and re-run; no expected ranking is hard-coded.
- Optional semantic matching is not implemented; `matcher.SkillMatcher` is the extension point.
- The score is decision support, not a judgment of a person's ability.
