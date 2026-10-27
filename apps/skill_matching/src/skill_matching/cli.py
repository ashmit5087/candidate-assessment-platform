"""Terminal CLI for Role 5.

    python -m skill_matching.cli --candidate C.json --jd J.json [--format text|json]

Exit codes: 0 success, 2 invalid input / contract, 1 unexpected error.
Errors go to stderr. Candidate emails and other personal fields are never printed.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .schemas import MatchResponse, SkillResult
from .service import InvalidInputError, match_raw

MAX_FILE_BYTES = 5 * 1024 * 1024


def _load_json(path_str: str, label: str):
    path = Path(path_str)
    if not path.is_file():
        raise InvalidInputError(f"{label} file not found or not a regular file: {path_str}")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise InvalidInputError(f"{label} file is larger than {MAX_FILE_BYTES // (1024 * 1024)} MB")
    try:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        raise InvalidInputError(f"{label} file is not valid JSON ({exc.msg} at line {exc.lineno})")
    except UnicodeDecodeError:
        raise InvalidInputError(f"{label} file is not valid UTF-8 text")
    except OSError as exc:
        raise InvalidInputError(f"cannot read {label} file: {exc.strerror}")


def _skill_line(r: SkillResult) -> list[str]:
    cand = f" <- {r.candidate_skill}" if r.candidate_skill else ""
    lines = [f"  - {r.skill_name} [{r.category_code}]{cand}"]
    lines.append(f"      {r.rationale}")
    if r.candidate_evidence:
        lines.append(f"      candidate evidence: {r.candidate_evidence}")
    if r.jd_evidence:
        lines.append(f"      JD evidence: {r.jd_evidence}")
    return lines


def render_text(resp: MatchResponse, candidate_name: str | None) -> str:
    out: list[str] = []
    title = f"{resp.role or 'Role'} @ {resp.company or 'Company'}"
    out.append(f"SKILL MATCH  |  JD: {resp.jd_source_file or '(unnamed)'}  |  {title}")
    if candidate_name:
        out.append(f"Candidate: {candidate_name}")
    out.append("=" * 72)
    out.append(f"MATCH SCORE: {resp.match_score}/100")
    out.append(resp.summary)
    b = resp.score_breakdown
    out.append(
        f"({b.formula}; matched={b.matched_weight:g}, partial={b.partial_weight:g}, "
        f"total={b.total_required_weight:g}; weighting: {b.weighting})"
    )
    sections = [
        ("MATCHED", resp.matched_skills),
        ("PARTIAL (counts 0.5, review recommended)", resp.partial_matches),
        ("NEEDS REVIEW (counts 0)", resp.review_required),
        ("MISSING - gap list", resp.missing_skills),
    ]
    for title_, items in sections:
        out.append("")
        out.append(f"{title_}: {len(items)}")
        if not items:
            out.append("  (none)")
        for r in items:
            out.extend(_skill_line(r))
    if resp.warnings:
        out.append("")
        out.append("WARNINGS:")
        out.extend(f"  ! {w}" for w in resp.warnings)
    out.append("")
    out.append(resp.disclaimer)
    return "\n".join(out)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="skill-match",
        description="Score one candidate against one extracted JD skill list.",
    )
    p.add_argument("--candidate", required=True, metavar="PATH", help="candidate/profile JSON")
    p.add_argument("--jd", required=True, metavar="PATH", help="Role 1 JD skill-list JSON")
    p.add_argument("--format", choices=("text", "json"), default="text")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        candidate = _load_json(args.candidate, "candidate")
        jd = _load_json(args.jd, "jd")
        resp = match_raw(candidate, jd)
    except InvalidInputError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # noqa: BLE001 - never leak a traceback to the terminal user
        print(f"error: unexpected failure ({type(exc).__name__})", file=sys.stderr)
        return 1

    if args.format == "json":
        print(json.dumps(resp.model_dump(mode="json"), indent=2, ensure_ascii=False))
    else:
        name = candidate.get("name") if isinstance(candidate, dict) else None
        print(render_text(resp, name if isinstance(name, str) else None))
    return 0


if __name__ == "__main__":
    sys.exit(main())
