# RADIX Talent Match Hackathon --- Role 5: Skill Matching

## Implementation Blueprint and Claude Code Build Instructions

> **Scope:** Implement **Role 5 (Skill Matching) only**. Do not build
> the React UI; Role 3 owns the UI. This role must be runnable and
> testable from the terminal, and expose a small API so the rest of the
> team can integrate it.
>
> **Hackathon source:** *RADIX Talent Match Hackathon --- Participant
> Brief, October 2026*. Role 5 is described on page 8; the shared data
> contract and hand-offs are on pages 9--10; sample JD/candidate context
> is on page 11; stack and definition of done are on page 13.
>
> **Important:** The brief specifies Role 5's purpose and output shape,
> but does **not** prescribe HTTP endpoint paths, a precise scoring
> formula, or a specific matching library. The endpoints, algorithm, and
> folder structure below are implementation proposals designed to fit
> the brief and make team integration reliable.

------------------------------------------------------------------------

## 1. Paste this instruction into Claude Code

You are implementing **only Role 5 --- Skill Matching** for the RADIX
Talent Match Hackathon. Read this entire document first and follow it as
the local specification.

### Mission

Build a robust Python component that compares a candidate's
skills/profile against **one specific job description's extracted skill
list** from Role 1. Return:

-   a match score from `0` to `100`;
-   skills that matched, with the evidence and match rationale;
-   missing skills;
-   optional partial matches and review-needed matches;
-   a concise, honest explanation of how the score was calculated.

Prioritize an actionable gap list over an unexplained number. A match
score must not be a constant and must change meaningfully across
different candidate/JD combinations.

### Boundaries

-   Implement Role 5 only. Do not implement Role 1 JD extraction, Role 2
    resume parsing, Role 3 profile building/UI, or Role 4 company-level
    Talent Check.
-   No frontend, React components, or browser UI.
-   Use Python throughout, as requested in the hackathon brief.
-   Provide a terminal CLI for demonstration and testing.
-   Provide a FastAPI HTTP interface for integration with the team's
    other roles. The API is an integration boundary, not a UI.
-   Accept the shared JSON contract documented below; be tolerant of
    optional fields but validate required fields.
-   Do not fabricate skills or evidence. Preserve the evidence supplied
    by upstream roles.
-   Do not call an external LLM by default. The baseline must work
    offline and deterministically. Keep matching behind an interface so
    an optional semantic/LLM matcher can be added later without changing
    the API contract.
-   Do not invent candidate proficiency levels if upstream data does not
    provide them.
-   Do not claim a skill is proven merely because a related term
    appears. Use conservative synonym/alias matching and make the
    rationale inspectable.

### Build sequence

1.  Inspect the existing repository before editing. Preserve the team's
    existing conventions and avoid overwriting other roles' work.
2.  If this is a shared repository, place Role 5 code in the agreed Role
    5 folder (suggested path: `apps/skill_matching/` below). Do not
    create a second repository or change global dependencies without
    team agreement.
3.  Implement schema models, normalization, matching, scoring, CLI, API,
    fixtures, tests, and README.
4.  Run tests and CLI demos from the repository root and from the Role 5
    folder where practical.
5.  Fix failures rather than merely describing them.
6.  Finish with: files created/changed, commands run, test results,
    example score, and known limitations.

------------------------------------------------------------------------

## 2. Whole product context (for integration only)

The integrated product is **RADIX Talent Match**, a candidate-facing
job-readiness tool with five separate pieces:

1.  **Role 1 --- JD Analytics:** reads a JD (PDF/DOCX) and extracts a
    structured list of skills/technologies.
2.  **Role 2 --- Resume Parsing:** reads a resume (PDF/DOCX) and
    extracts skills plus reliable fields such as education, projects,
    and experience.
3.  **Role 3 --- Profile Builder:** lets the candidate build/edit/save a
    profile, ideally pre-filled from Role 2. This role owns the UI.
4.  **Role 4 --- Talent Check:** compares a saved profile against a
    company's expected levels across all 12 RADIX skillsets and returns
    readiness score plus category gaps.
5.  **Role 5 --- Skill Matching (this task):** compares a candidate
    profile or skill list against one **specific JD**, returning match
    score and matched/missing skills.

### Integrated flow

`Select JD → Parse resume → Build/update profile → Run Talent Check → Run Skill Matching`

Role 5 consumes data from Role 1 and Role 3 (or a resume/skills object
during isolated testing). It must not depend on Role 4's company
readiness score; company-level readiness and JD-level matching answer
different questions.

### Source brief's role-specific definition

Page 8 says Role 5 should show how well a candidate matches one actual
job posting, not a company in general. Input: a profile or resume plus
one extracted JD skill list from Role 1. Output: a match score plus
matched and missing skills. The brief suggests an LLM or similarity
matching if time permits, or exact/fuzzy matching if not, and emphasizes
that a score without an explanation is much less useful than a gap list.

------------------------------------------------------------------------

## 3. Shared data contract

The team should agree on one contract before integration. Use the
following compatible shapes unless the team has already locked a
different schema. If the team changes field names, add a small adapter
rather than scattering special cases throughout the matching code.

### 3.1 Skill object

``` json
{
  "skill_name": "Python",
  "category_code": "COD",
  "evidence": "Built a Python data-processing project",
  "confidence": "high"
}
```

`category_code` must be one of:

-   `COD` --- Coding
-   `DSA` --- Data Structures & Algorithms
-   `OOD` --- Object-Oriented Design
-   `APTI` --- Aptitude
-   `COMM` --- Communication
-   `AI` --- AI
-   `CLOUD` --- Cloud
-   `SQL` --- SQL
-   `SWE` --- Software Engineering
-   `SYSD` --- System Design
-   `NETW` --- Networking
-   `OS` --- Operating Systems
-   `OTHER` --- anything outside the 12 categories

`confidence` is `high`, `medium`, or `low`. Keep upstream confidence as
evidence quality; do not treat it as a candidate proficiency level.

### 3.2 Role 1 JD skill-list input

``` json
{
  "source_type": "jd",
  "source_file": "google_swe_jd.docx",
  "company": "Google LLC",
  "role": "Software Engineer (SWE)",
  "skills": [
    {
      "skill_name": "Python",
      "category_code": "COD",
      "evidence": "Experience building software in Python",
      "confidence": "high"
    },
    {
      "skill_name": "Data Structures and Algorithms",
      "category_code": "DSA",
      "evidence": "Strong foundations in data structures and algorithms",
      "confidence": "high"
    }
  ]
}
```

### 3.3 Role 3 candidate profile input

``` json
{
  "name": "Ananya Rao",
  "email": "ananya@example.com",
  "education": "B.Tech Computer Science",
  "skills": [
    {
      "skill_name": "Python programming",
      "category_code": "COD",
      "evidence": "Implemented data processing scripts in Python",
      "confidence": "high"
    },
    {
      "skill_name": "Algorithms",
      "category_code": "DSA",
      "evidence": "Solved algorithmic problems and implemented sorting/searching",
      "confidence": "medium"
    }
  ],
  "hackathons": [],
  "internships": [],
  "certifications": [],
  "preferred_roles": ["Software Engineer"],
  "cv_file": "ananya_rao_resume.pdf"
}
```

Fields other than `skills` may be absent or empty. The initial baseline
should match the `skills` array. The implementation may optionally
extract additional evidence from projects, internships, certifications,
and hackathons **only if those fields contain explicit skill/evidence
text**; it must not assume that an activity proves a skill.

### 3.4 Role 5 output contract

The brief's minimum output is:

``` json
{
  "jd_source_file": "google_swe_jd.docx",
  "match_score": 76,
  "matched_skills": [],
  "missing_skills": []
}
```

Keep these required fields exactly. You may add fields that help explain
the result, such as `partial_matches`, `review_required`,
`score_breakdown`, `summary`, `algorithm_version`, and `warnings`. Never
remove or rename the required fields without team agreement.

------------------------------------------------------------------------

## 4. Recommended scoring and matching approach

Implement a **deterministic, explainable baseline first**. Avoid a
black-box score and avoid adding an LLM dependency just to compare
lists.

### 4.1 Normalize skill names

Create a reusable normalizer that: - lowercases and trims whitespace; -
normalizes punctuation, repeated spaces, `&`/`and`, and common
separators; - treats common spelling/format variants consistently
(e.g. `scikit-learn` / `scikit learn`); - applies a small, explicit
alias dictionary for unambiguous equivalents (e.g. `postgres` ↔
`postgresql`, `js` ↔ `javascript`, `data structures & algorithms` ↔
`data structures and algorithms`); - does **not** make unsafe
equivalences (e.g. Java ≠ JavaScript, AI ≠ machine learning, SQL ≠
PostgreSQL, AWS ≠ cloud in general).

Keep the alias dictionary in one file and test it. Avoid fuzzy matching
that silently equates unrelated technologies.

### 4.2 Match each required JD skill

For every JD skill, classify it as one of:

-   **Matched:** exact normalized name or approved alias.
-   **Partial match:** defensible related skill/phrase match, not enough
    to claim full equivalence. Include a reason and mark for review.
-   **Missing:** no candidate skill provides sufficient evidence.
-   **Review required:** ambiguous or weak evidence; do not silently
    count it as fully matched.

For each result include: - JD skill name and category; - JD evidence; -
candidate skill name(s), if any; - candidate evidence, if any; - status
(`matched`, `partial`, `missing`, or `review_required`); - rationale; -
confidence, if available.

### 4.3 Baseline score

Use **weighted required-skill coverage**:

\[ `\text{match score}`{=tex} = 100 `\times`{=tex}
`\frac{\sum_i w_i s_i}{\sum_i w_i}`{=tex} \]

Where: - `w_i` is the importance weight of JD skill `i`; - `s_i = 1.0`
for a confirmed match; - `s_i = 0.5` for a partial match; - `s_i = 0.0`
for missing/review-required skills.

If the upstream JD skill object has no importance/weight field, use
`1.0` for every skill. Do not pretend the brief supplies weights. Keep
the default equal-weight behavior transparent. If the team agrees on
weights later, accept an optional `importance` field without breaking
the shared contract.

**Do not boost the score** just because the candidate has many unrelated
skills. The denominator should be the JD's required skills, not every
skill in the candidate profile. A missing or empty JD skill list should
return a validation error, not a perfect score or division-by-zero
result.

### 4.4 Confidence and evidence handling

-   Preserve evidence exactly as provided by upstream data, with
    reasonable length limits for output.
-   Low-confidence upstream skill extraction should trigger a warning or
    `review_required`, not an automatic strong match.
-   Do not equate extraction confidence with skill proficiency.
-   If a candidate skill has no evidence, an exact skill-name match can
    still be shown, but mark evidence as absent and explain the
    limitation.
-   If multiple candidate skills match one JD skill, count that JD skill
    once.
-   If one candidate skill maps to multiple JD requirements, do not let
    it inflate the score beyond one contribution per JD requirement;
    list the mapping and rationale.
-   Keep scoring deterministic for identical inputs.

### 4.5 Optional semantic matching

Only add semantic embeddings or an LLM after the deterministic baseline
and tests work. If implemented: - make it optional and configurable; -
preserve an offline/deterministic fallback; - return the matching method
and rationale; - never let a semantic similarity score alone assert a
skill as proven; - add tests for false positives and ambiguous terms; -
do not require an API key for the core demo.

------------------------------------------------------------------------

## 5. Suggested Role 5 folder and file structure

Fit this into the team's actual repository. If the team has a monorepo,
keep this under the agreed application directory rather than creating a
parallel repo.

``` text
RADIX-Talent-Match/
├── README.md                         # whole-team setup / integration notes
├── pyproject.toml                    # shared only if the team agrees
├── .gitignore
├── contracts/
│   └── role5_skill_matching.schema.json
├── apps/
│   └── skill_matching/
│       ├── README.md                 # Role 5 setup, examples, limitations
│       ├── pyproject.toml            # use only if roles manage dependencies separately
│       ├── .env.example              # optional future semantic matcher settings
│       ├── data/
│       │   ├── sample_candidate.json
│       │   ├── sample_jd.json
│       │   └── sample_jd_data_role.json
│       ├── src/
│       │   └── skill_matching/
│       │       ├── __init__.py
│       │       ├── config.py
│       │       ├── schemas.py
│       │       ├── normalizer.py
│       │       ├── aliases.py
│       │       ├── matcher.py
│       │       ├── scorer.py
│       │       ├── service.py
│       │       ├── api.py
│       │       └── cli.py
│       └── tests/
│           ├── test_normalizer.py
│           ├── test_matcher.py
│           ├── test_scorer.py
│           ├── test_service.py
│           └── test_api.py
└── docs/
    └── role5-integration.md
```

### File responsibilities

  ----------------------------------------------------------------------------------
  File                                           Responsibility
  ---------------------------------------------- -----------------------------------
  `schemas.py`                                   Pydantic request/response models;
                                                 validate skill fields and score
                                                 ranges.

  `normalizer.py`                                Normalize strings and apply safe
                                                 aliases.

  `aliases.py`                                   Explicit, documented
                                                 alias/equivalence dictionary.

  `matcher.py`                                   Classify JD requirements as
                                                 matched, partial, missing, or
                                                 review required.

  `scorer.py`                                    Calculate weighted coverage score
                                                 and transparent breakdown.

  `service.py`                                   Orchestrate validation → matching →
                                                 scoring → response.

  `api.py`                                       FastAPI endpoints; no UI logic.

  `cli.py`                                       Terminal commands for scoring JSON
                                                 files and printing a readable
                                                 report/JSON.

  `config.py`                                    Environment/config defaults; no
                                                 secrets committed.

  `tests/`                                       Unit, integration, API and
                                                 edge-case tests.

  `contracts/role5_skill_matching.schema.json`   Team-visible JSON contract for
                                                 integration.
  ----------------------------------------------------------------------------------

If the repository already has a shared `pyproject.toml`, shared
dependencies, or `apps/` conventions, follow them rather than creating
conflicting configuration files. Prefer one agreed dependency manager
across the team; do not mix `pip`, `uv`, and per-role virtual
environments without a documented reason.

------------------------------------------------------------------------

## 6. Proposed API endpoints

These routes are **recommended design choices**, not routes specified by
the hackathon brief. Keep them small and stable so Role 3 can call them
later.

Base URL for local development: `http://127.0.0.1:8005`

  ---------------------------------------------------------------------------
  Method                  Endpoint                    Purpose
  ----------------------- --------------------------- -----------------------
  `GET`                   `/health`                   Check that Role 5 is
                                                      running.

  `GET`                   `/`                         Service name/version
                                                      and brief endpoint
                                                      pointers.

  `POST`                  `/api/v1/matches`           Compare one
                                                      candidate/profile
                                                      against one extracted
                                                      JD skill list.

  `POST`                  `/api/v1/matches/preview`   Optional debug endpoint
                                                      returning match
                                                      classifications without
                                                      final score, useful
                                                      during development.
  ---------------------------------------------------------------------------

### `POST /api/v1/matches`

Request:

``` json
{
  "candidate": {
    "name": "Ananya Rao",
    "skills": [
      {
        "skill_name": "Python programming",
        "category_code": "COD",
        "evidence": "Built scripts in Python",
        "confidence": "high"
      }
    ]
  },
  "job_description": {
    "source_type": "jd",
    "source_file": "google_swe_jd.docx",
    "company": "Google LLC",
    "role": "Software Engineer (SWE)",
    "skills": [
      {
        "skill_name": "Python",
        "category_code": "COD",
        "evidence": "Experience building software in Python",
        "confidence": "high"
      },
      {
        "skill_name": "Data Structures and Algorithms",
        "category_code": "DSA",
        "evidence": "Strong DSA fundamentals",
        "confidence": "high"
      }
    ]
  }
}
```

Response (illustrative shape; score depends on the actual algorithm and
input):

``` json
{
  "jd_source_file": "google_swe_jd.docx",
  "company": "Google LLC",
  "role": "Software Engineer (SWE)",
  "match_score": 50,
  "matched_skills": [
    {
      "skill_name": "Python",
      "category_code": "COD",
      "candidate_skill": "Python programming",
      "jd_evidence": "Experience building software in Python",
      "candidate_evidence": "Built scripts in Python",
      "status": "matched",
      "rationale": "Candidate skill matches the JD requirement through an approved normalized/alias match.",
      "weight": 1.0,
      "contribution": 1.0
    }
  ],
  "missing_skills": [
    {
      "skill_name": "Data Structures and Algorithms",
      "category_code": "DSA",
      "jd_evidence": "Strong DSA fundamentals",
      "status": "missing",
      "rationale": "No candidate skill provided sufficient matching evidence.",
      "weight": 1.0,
      "contribution": 0.0
    }
  ],
  "partial_matches": [],
  "review_required": [],
  "score_breakdown": {
    "scoring_method": "weighted_required_skill_coverage",
    "matched_weight": 1.0,
    "partial_weight": 0.0,
    "total_required_weight": 2.0,
    "formula": "100 * (matched_weight + 0.5 * partial_weight) / total_required_weight"
  },
  "summary": "The candidate matches 1 of 2 required skills. The main gap is Data Structures and Algorithms.",
  "algorithm_version": "1.0.0",
  "warnings": []
}
```

The illustrative response's `match_score` is 50 because one of two
equally weighted JD skills is matched. Keep the brief's required fields
(`jd_source_file`, `match_score`, `matched_skills`, `missing_skills`)
present even if adding richer fields.

### Error behavior

-   `400 Bad Request`: invalid JSON or invalid contract.
-   `422 Unprocessable Entity`: structurally valid request but no JD
    skills / unsupported skill data.
-   `500 Internal Server Error`: unexpected failure; do not expose stack
    traces or secrets in the response.
-   Use FastAPI/Pydantic's normal validation behavior where appropriate,
    but document it.
-   Avoid returning a successful `200` with a misleading score for
    invalid input.

------------------------------------------------------------------------

## 7. Terminal-first workflow

No UI is needed for Role 5. A teammate should be able to run a single
command and see the score and gaps.

### Suggested commands

Choose commands consistent with the team's environment. If using `uv`:

``` bash
# from the Role 5 folder
uv sync
uv run pytest -q
uv run python -m skill_matching.cli \
  --candidate data/sample_candidate.json \
  --jd data/sample_jd.json \
  --format text

# JSON output for debugging or piping to another tool
uv run python -m skill_matching.cli \
  --candidate data/sample_candidate.json \
  --jd data/sample_jd.json \
  --format json

# start API
uv run uvicorn skill_matching.api:app --reload --host 127.0.0.1 --port 8005
```

If the package layout requires installation or a `src` path
configuration, configure `pyproject.toml` so these commands work from
the Role 5 directory without manually changing `PYTHONPATH`.

### CLI requirements

-   `--candidate PATH` and `--jd PATH` are required.
-   `--format text|json` with `text` as default.
-   Print match score, matched skills, partial/review-needed skills,
    missing skills, and warnings.
-   Print useful validation errors to stderr and exit non-zero on
    failure.
-   Return exit code `0` for successful matching and non-zero for
    invalid input or runtime errors.
-   Do not print API keys or sensitive data.
-   Include at least two distinct demo combinations so the score visibly
    changes.

### API smoke test

``` bash
curl -X POST "http://127.0.0.1:8005/api/v1/matches" \
  -H "Content-Type: application/json" \
  --data-binary @data/sample_match_request.json
```

Create `data/sample_match_request.json` if useful, or document how to
construct the request. Also test the API via FastAPI's `TestClient` so a
running server is not required for unit tests.

------------------------------------------------------------------------

## 8. Test plan and acceptance criteria

The hackathon brief's overall definition of done says all five pieces
should run independently against at least two sample JDs/resumes, the
integrated flow should work for at least one company/JD/candidate
combination, and results should differ across candidates. For Role 5,
implement and demonstrate the following.

### Required unit tests

1.  Exact skill match.
2.  Approved alias match.
3.  Java must not match JavaScript.
4.  SQL must not automatically match PostgreSQL.
5.  A missing JD skill appears in `missing_skills`.
6.  A defensible partial match is labeled partial, not full.
7.  Empty candidate skills produce a low/zero score without crashing.
8.  Empty JD skills are rejected with a clear validation error.
9.  Duplicate candidate skills do not inflate the score.
10. Multiple candidate skills matching one JD skill count only once for
    that requirement.
11. Low-confidence upstream extraction produces a warning or review
    status.
12. Missing evidence is not fabricated.
13. Scores are always between 0 and 100.
14. Identical inputs yield identical results.
15. A candidate with a stronger relevant skill set scores higher than a
    weaker candidate against the same JD.
16. API returns the required output fields and validation errors
    clearly.
17. CLI text and JSON modes work.

### End-to-end terminal demonstration

Use at least two JDs from the supplied pack where available, and
multiple candidate profiles. The brief names six JDs across Google LLC,
Microsoft Corporation, and Oracle Financial Services Software, and four
sample candidates:

-   Ananya Rao --- systems-leaning generalist; stronger for SWE-heavy
    roles than data roles.
-   Karthik Subramaniam --- data-leaning analyst; stronger for Data
    Scientist/Data Analyst than pure SWE.
-   Priya Menon --- entry-level, support-oriented; best fit for Oracle
    FSS roles.
-   Rohan Verma --- strong all-rounder; competitive across nearly every
    role.

These descriptions are **expected qualitative patterns from the brief**,
not numeric ground-truth scores. Do not hardcode the expected ranking.
Run the algorithm against the actual provided JD skill lists and
profiles, and report observed results honestly. If those data files are
not present, use clearly labeled synthetic fixtures only for smoke tests
and ask the team to place the official pack in the agreed data location.

### Acceptance checklist

-   [ ] Role 5 runs without any frontend.
-   [ ] The CLI accepts candidate and JD JSON files.
-   [ ] The API starts locally and returns a JSON response.
-   [ ] Required response fields are always present on successful
    matching.
-   [ ] Match score is dynamic and explainable.
-   [ ] Each JD requirement is accounted for in
    matched/partial/missing/review output.
-   [ ] No score inflation from unrelated or duplicate candidate skills.
-   [ ] At least two different JD fixtures and two different candidate
    fixtures tested.
-   [ ] Tests cover normalization, matching, scoring, CLI/API and edge
    cases.
-   [ ] README contains setup, commands, endpoint contract, sample
    output and limitations.
-   [ ] Code is isolated from other roles and does not implement their
    responsibilities.

------------------------------------------------------------------------

## 9. Dependencies and environment

Prefer a small dependency footprint:

-   `fastapi` --- HTTP API.
-   `uvicorn[standard]` --- local API server.
-   `pydantic` --- request/response validation (FastAPI already depends
    on Pydantic).
-   `pytest` --- tests.
-   `httpx` --- API tests via FastAPI `TestClient` if needed.

Do not add LangChain, vector databases, embedding models, or an external
LLM to the baseline unless there is a working, tested reason. The brief
explicitly says fuzzy matching is a candidate use case for
LLM/similarity, not a requirement to use an agent.

If the repository uses `uv`, use `uv` consistently. If the team has
already standardized on `pip`/venv, follow that convention instead.
Avoid multiple conflicting lockfiles.

------------------------------------------------------------------------

## 10. Security, privacy, and quality

-   Treat resume/profile fields as untrusted user input.
-   Do not log full resumes, email addresses, or other unnecessary
    personal data.
-   Validate file paths in CLI input and return safe errors.
-   Never execute content from JSON fields.
-   Do not send candidate information to external APIs in the baseline.
-   Keep secrets out of source control; provide `.env.example` only if
    configuration is needed.
-   Do not make hiring decisions automatically. Describe the score as
    **decision support**, with evidence and limitations, not a
    definitive judgment of a person's ability.
-   Avoid inferring protected or personal attributes from names,
    education, or resume content.
-   Keep matching rationale inspectable so a reviewer can challenge
    false positives.

------------------------------------------------------------------------

## 11. Integration agreement for the team

Before wiring Role 5 into the integrated tool, confirm these points with
Roles 1 and 3:

1.  The exact key for the JD skills array is `skills`.
2.  Each skill uses `skill_name`, `category_code`, `evidence`, and
    `confidence`.
3.  Role 1 supplies a JD-level `source_file`, company, and role where
    available.
4.  Role 3 supplies candidate `skills` in the same skill-object format.
5.  Role 5's API request wraps the objects as `candidate` and
    `job_description` (or the team agrees on an adapter).
6.  The shared repository's run command, port, dependency manager, and
    folder location are agreed.
7.  Role 5 output retains `jd_source_file`, `match_score`,
    `matched_skills`, and `missing_skills`.

Do not make Role 5 wait for the UI. The terminal CLI and tests should be
enough to develop and validate it independently.

------------------------------------------------------------------------

## 12. Final instruction to Claude

**Implement the code, not just a plan.** Inspect the existing
repository, create or update only the Role 5 files, implement the
matching/scoring logic and API/CLI, add fixtures and automated tests,
run them, fix failures, and provide a concise completion report. If the
official sample pack or agreed shared schema is missing, keep the core
implementation functional with clearly labeled fixtures and document
exactly what is needed for final integration. Do not fabricate official
data or claim unrun tests passed.
