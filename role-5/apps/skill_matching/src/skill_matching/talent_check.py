"""Use Role 4's Talent Check result to shortcut and refine Role 5 scoring.

Per JD skill, by its category_code:
  * no Role 4 row / levels unknown / gap <= 0 -> normal matching, full credit
  * 0 < gap <= 3 (scored gap)                 -> normal matching, credit x (candidate/required level)
  * gap > 3 (critical gap)                    -> missing straight from Role 4, matching skipped

Critical-gap skills stay in the score denominator (0 credit); dropping them would hide the
very gaps the candidate most needs to see. Role 4's readiness_score is passed through for
context only and is NOT blended into match_score (they answer different questions).
"""

from __future__ import annotations

from typing import Optional

from .config import CRITICAL_GAP_MIN
from .matcher import DeterministicMatcher, SkillMatcher, dedupe_jd
from .normalizer import normalize_text
from .schemas import (
    CandidateProfile,
    JobDescription,
    MatchResponse,
    Skill,
    SkillResult,
    TalentCheckContext,
    TalentCheckResult,
)


def _levels(tc: TalentCheckResult) -> dict[str, tuple[int, int, int]]:
    """category -> (required, candidate, gap). Worst (largest) gap wins on duplicates."""
    out: dict[str, tuple[int, int, int]] = {}
    for row in tc.skillset_gap:
        if row.required_level is None or row.candidate_level is None:
            continue
        gap = row.required_level - row.candidate_level
        prev = out.get(row.category_code)
        if prev is None or gap > prev[2]:
            out[row.category_code] = (row.required_level, row.candidate_level, gap)
    return out


def _critical_result(jd: Skill, req: int, cand: int, gap: int) -> SkillResult:
    return SkillResult(
        skill_name=jd.skill_name,
        category_code=jd.category_code,
        status="missing",
        jd_evidence=jd.evidence,
        jd_confidence=jd.confidence,
        critical_gap=True,
        category_required_level=req,
        category_candidate_level=cand,
        category_gap=gap,
        level_factor=0.0,
        match_method="talent_check_critical_gap",
        rationale=(
            f"Critical gap from Talent Check: {jd.category_code} required level {req}, "
            f"candidate level {cand} (gap {gap}, critical when gap >= {CRITICAL_GAP_MIN}). "
            "Skill matching was skipped for this requirement."
        ),
        weight=float(jd.importance) if jd.importance else 1.0,
        contribution=0.0,
    )


def run_match_with_talent_check(
    candidate: CandidateProfile,
    jd: JobDescription,
    tc: TalentCheckResult,
    matcher: Optional[SkillMatcher] = None,
) -> MatchResponse:
    # imported here to avoid a circular import with service.py
    from .service import _DEFAULT_MATCHER, assemble_response

    matcher = matcher or _DEFAULT_MATCHER
    levels = _levels(tc)
    jd_unique, warnings = dedupe_jd(jd.skills)

    critical: dict[int, SkillResult] = {}
    to_match: list[tuple[int, Skill]] = []
    for i, s in enumerate(jd_unique):
        lv = levels.get(s.category_code)
        if lv and lv[2] >= CRITICAL_GAP_MIN:
            critical[i] = _critical_result(s, *lv)
        else:
            to_match.append((i, s))

    outcome = matcher.match([s for _, s in to_match], candidate.skills) if to_match else None
    matched_results = list(outcome.results) if outcome else []
    if outcome:
        warnings += outcome.warnings
    elif not candidate.skills:
        warnings.append("Candidate has no skills; every requirement is reported missing.")

    # Matcher output keeps input order, so zip back onto original positions.
    by_index: dict[int, SkillResult] = dict(critical)
    for (i, _), r in zip(to_match, matched_results):
        lv = levels.get(r.category_code)
        if lv:
            req, cand, gap = lv
            r.category_required_level, r.category_candidate_level, r.category_gap = req, cand, gap
            if 0 < gap < CRITICAL_GAP_MIN and r.status in ("matched", "partial"):
                r.level_factor = round(max(0.0, cand) / req, 4)
                r.contribution = round(r.contribution * r.level_factor, 6)
                r.rationale += (
                    f" Credit scaled to {r.level_factor:.0%} because Talent Check shows a "
                    f"{r.category_code} level gap (required {req}, candidate {cand})."
                )
            elif r.status in ("matched", "partial"):
                r.level_factor = 1.0
        by_index[i] = r
    results = [by_index[i] for i in sorted(by_index)]

    if tc.company and jd.company and normalize_text(tc.company) != normalize_text(jd.company):
        warnings.append(
            f"Talent Check company '{tc.company}' differs from JD company '{jd.company}'; "
            "category levels may not describe this employer's bar."
        )

    scored = sorted(c for c, (_, _, g) in levels.items() if 0 < g < CRITICAL_GAP_MIN)
    crit = sorted(c for c, (_, _, g) in levels.items() if g >= CRITICAL_GAP_MIN)
    ctx = TalentCheckContext(
        readiness_score=tc.readiness_score,
        critical_gap_threshold=f"gap >= {CRITICAL_GAP_MIN} (required_level - candidate_level)",
        critical_categories=crit,
        scored_gap_categories=scored,
        handling=(
            "critical-gap categories are reported missing directly from Talent Check and kept in the "
            "denominator at 0 credit; gaps of 1-3 scale matched/partial credit by candidate/required "
            "level; readiness_score is informational only."
        ),
    )
    return assemble_response(jd, results, warnings, ctx)
