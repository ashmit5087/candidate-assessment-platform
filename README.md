# RADIX Candidate Assessment Platform - Role 4: Talent Check

Deterministic candidate readiness scoring and 12-skillset gap analysis engine for the RADIX Talent Match Platform.

## Overview

**Role 4 (Talent Check)** evaluates a candidate's profile against target company benchmarks across all 12 RADIX skill categories. It calculates an evidence-weighted readiness score (0–100) and provides a per-skillset gap breakdown without using LLMs.

### Key Features
- **12 RADIX Skill Categories:** `COD`, `DSA`, `OOD`, `APTI`, `COMM`, `AI`, `CLOUD`, `SQL`, `SWE`, `SYSD`, `NETW`, `OS`.
- **Layer A (Evidence Points & Saturating Curve):** Converts qualitative signals (skills, confidence, internships, hackathons, certifications, projects) into a 0–10 level using a saturating exponential curve:
  $$\text{level} = \text{round}(10 \times (1 - e^{-\text{points} / k}))$$
- **Layer B (Deterministic Scoring Engine):** Computes requirement-weighted readiness scores, critical gap detection ($\text{gap} \ge 3$), and prioritized action items.
- **CLI Evaluator:** Terminal reports with ASCII bar charts, enriched JSON, and shared contract formats.
- **FastAPI Service:** REST API endpoints for upstream integration with Profile Builder (Role 3) and Skill Matching (Role 5).

---

## Project Structure

```
.
├── RADIX_Talent_Check_Context.md            # Hackathon brief and specifications
├── staging_company_skill_levels_rows.sql   # 116 company hiring requirements (SQL)
└── talent_check/
    ├── cli.py                              # Terminal CLI evaluator
    ├── test_scoring.py                     # Benchmark verification tests
    ├── backend/
    │   ├── loader.py                       # SQL to companies.json parser
    │   ├── levels.py                       # Layer A: Evidence points & saturating curve
    │   ├── scoring.py                      # Layer B: Scoring engine & gap analysis
    │   └── api.py                          # FastAPI REST service
    └── data/
        ├── companies.json                  # Normalized company requirements (116 companies)
        └── mock_profiles/                  # Diverse test candidate profiles
            ├── ananya_rao.json             # Systems generalist (OS/NETW/SWE)
            ├── karthik_subramaniam.json    # Data analyst (SQL/AI/APTI)
            ├── priya_menon.json            # Support / Database analyst (Oracle FSS)
            └── rohan_verma.json            # Competitive programmer & full-stack
```

---

## Quick Start

### 1. Run Automated Tests
```bash
python -m talent_check.test_scoring
```

### 2. Run the CLI
* **Interactive Terminal Report:**
  ```bash
  python -m talent_check.cli --candidate priya_menon --company "Oracle Financial"
  ```
* **Official Shared Contract JSON:**
  ```bash
  python -m talent_check.cli --candidate priya_menon --company "Google" --format contract
  ```
* **Batch Benchmark Across All Candidates:**
  ```bash
  python -m talent_check.cli --candidate all --company "Google"
  ```
* **List Companies & Candidates:**
  ```bash
  python -m talent_check.cli --list-companies
  python -m talent_check.cli --list-candidates
  ```

### 3. Start the FastAPI Service
```bash
python -m uvicorn talent_check.backend.api:app --reload --port 8000
```
API Documentation: `http://localhost:8000/docs`
