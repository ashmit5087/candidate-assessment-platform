"""Orchestrates validation -> matching -> scoring -> response."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import ValidationError

from .config import ALGORITHM_VERSION
from .matcher import DeterministicMatcher, SkillMatcher
from .schemas import (
    CandidateProfile,
    JobDescription,
    MatchRequest,
    MatchResponse,
    PreviewResponse,
)
from .scorer import compute_score

_DEFAULT_MATCHER = DeterministicMatcher()


class InvalidInputError(ValueError):
    """Raised for input that fails the shared contract (HTTP 400)."""


class NoJobSkillsError(InvalidInputError):
    """Structurally valid input, but the JD has no skills to match (HTTP 422)."""


def parse_inputs(candidate: Any, job_description: Any) -> MatchRequest:
    """Validate raw dicts into models, raising InvalidInputError with a clear message."""
    if isinstance(job_description, dict):
        jd_skills = job_description.get("skills")
        if isinstance(jd_skills, list) and len(jd_skills) == 0:
            raise NoJobSkillsError(
                "job_description.skills is empty: a JD with no extracted skills "
                "cannot be scored (no perfect score, no division by zero)."
            )
    try:
        return MatchRequest(
            candidate=CandidateProfile.model_validate(candidate),
            job_description=JobDescription.model_validate(job_description),
        )
    except ValidationError as exc:
        raise InvalidInputError(_format_errors(exc)) from exc


def _format_errors(exc: ValidationError) -> str:
    parts = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"])
        parts.append(f"{loc}: {err['msg']}")
    return "; ".join(parts)


def _summarize(resp_missing, matched, partial, review, total) -> str:
    n_matched = len(matched)
    text = f"The candidate matches {n_matched} of {total} required skills"
    extras = []
    if partial:
        extras.append(f"{len(partial)} partially")
    if review:
        extras.append(f"{len(review)} need review")
    if extras:
        text += " (" + ", ".join(extras) + ")"
    text += "."
    if resp_missing:
        names = [r.skill_name for r in resp_missing]
        shown = ", ".join(names[:5]) + (f" and {len(names) - 5} more" if len(names) > 5 else "")
        label = "gap is" if len(names) == 1 else "gaps are"
        text += f" The main {label} {shown}."
    elif not partial and not review:
        text += " No gaps were found against the extracted skill list."
    return text


def run_match(
    candidate: CandidateProfile,
    job_description: JobDescription,
    matcher: Optional[SkillMatcher] = None,
) -> MatchResponse:
    matcher = matcher or _DEFAULT_MATCHER
    outcome = matcher.match(job_description.skills, candidate.skills)
    score, breakdown = compute_score(outcome.results)

    by = lambda status: [r for r in outcome.results if r.status == status]  # noqa: E731
    matched, partial = by("matched"), by("partial")
    review, missing = by("review_required"), by("missing")

    return MatchResponse(
        jd_source_file=job_description.source_file,
        match_score=score,
        matched_skills=matched,
        missing_skills=missing,
        company=job_description.company,
        role=job_description.role,
        partial_matches=partial,
        review_required=review,
        score_breakdown=breakdown,
        summary=_summarize(missing, matched, partial, review, len(outcome.results)),
        algorithm_version=ALGORITHM_VERSION,
        warnings=outcome.warnings,
    )


def match_raw(candidate: Any, job_description: Any, matcher: Optional[SkillMatcher] = None) -> MatchResponse:
    req = parse_inputs(candidate, job_description)
    return run_match(req.candidate, req.job_description, matcher)


def preview_raw(candidate: Any, job_description: Any, matcher: Optional[SkillMatcher] = None) -> PreviewResponse:
    req = parse_inputs(candidate, job_description)
    outcome = (matcher or _DEFAULT_MATCHER).match(
        req.job_description.skills, req.candidate.skills
    )
    return PreviewResponse(
        jd_source_file=req.job_description.source_file,
        results=outcome.results,
        warnings=outcome.warnings,
    )
