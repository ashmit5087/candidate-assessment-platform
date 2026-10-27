# RADIX Talent Match

Candidate-facing career workspace for building a professional profile, analyzing
job descriptions, checking company skill readiness, and reviewing skill matches.
The frontend uses only documented service contracts and makes disconnected or
demo-only features explicit.

## Run

From the repo root, run `pnpm install` once, then `pnpm dev:web`. Vite serves
on `PORT` (default `5173`) under `BASE_PATH` (default `/`).

Run the frontend type check with:

```sh
pnpm --filter @workspace/radix-talent-match run typecheck
```

## Configuration

Copy `.env.example` to `.env` for local development, then set only the service
base URLs that are reachable from the browser. Keep the URLs distinct when
running multiple services locally; several backend READMEs use port `8000` by
default. Use actual hosted service URLs when the services are deployed
separately.

All `VITE_*` values are public browser configuration. Never put Gemini, Groq,
Supabase service-role, or other secrets in them.

| Variable | Purpose |
| --- | --- |
| `VITE_JD_API_BASE_URL` | Role 1 JD Analytics service |
| `VITE_RESUME_API_BASE_URL` | Reserved for a future Role 2 HTTP wrapper; no HTTP API is documented |
| `VITE_PROFILE_API_BASE_URL` | Role 3 Profile Builder service |
| `VITE_TALENT_CHECK_API_BASE_URL` | Reserved for Role 4; live calls remain disabled until its contract is supplied |
| `VITE_SKILL_MATCH_API_BASE_URL` | Role 5 Skill Matching service |
| `VITE_DEMO_MODE` | Explicitly enables visibly labelled fixtures; keep `false` in production |
| `VITE_AUTH_MODE` | Provider-neutral authentication UI mode; no authentication is implemented |
| `VITE_PROFILE_CONTRACT_CONFIRMED` | Must remain `false` until the actual Role 3 payload and response models are reviewed |

## Service status and limitations

- **Role 1 — JD Analytics:** documented endpoints support upload, list, detail,
  skill correction, search, categories, provider info, and health. Uploads
  accept PDF/DOCX up to 10 MB; scanned PDFs are not OCR'd.
- **Role 2 — Resume Parsing:** the supplied documentation describes a CLI/file
  workflow only. The UI must not call a guessed upload endpoint.
- **Role 3 — Profile Builder:** documented routes exist, but the actual
  Pydantic profile request/response models were not included. Live create and
  update must stay gated until those models are confirmed. Do not assume
  in-memory fallback data is durable. The documented API has no profile-list
  route, so matching asks for a saved `profile_id` rather than inventing a list
  endpoint. Profile lookup is gated by `VITE_PROFILE_CONTRACT_CONFIRMED`.
- **Role 4 — Talent Check:** exact HTTP paths and schemas were not supplied.
  The UI is interface-only until its API contract is available.
- **Role 5 — Skill Matching:** documented match and improvement-plan routes are
  configurable. Requests must send only the candidate skill subset and must
  not include candidate email. Scores and critical-gap flags come from the
  service; the browser does not calculate them.

The auth provider and developer permissions are not decided. Login screens are
visual only; they do not authenticate users or secure backend services. The
developer area is not an authorization boundary.
