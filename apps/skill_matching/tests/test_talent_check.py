from fastapi.testclient import TestClient

from conftest import cand, jd, sk
from skill_matching.api import app
from skill_matching.service import InvalidInputError, match_raw, match_with_talent_check_raw
import pytest

client = TestClient(app, raise_server_exceptions=False)


def row(cat, req, have):
    return {"category_code": cat, "required_level": req, "candidate_level": have, "gap": req > have}


def tc(*rows, readiness=50):
    return {"company": "Test Co", "readiness_score": readiness, "skillset_gap": list(rows)}


def test_critical_gap_goes_straight_to_missing_and_skips_matching():
    # Candidate HAS Python by name, but Role 4 says COD is a critical gap (8 vs 3).
    r = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), tc(row("COD", 8, 3)))
    assert r.match_score == 0
    m = r.missing_skills[0]
    assert m.critical_gap and m.match_method == "talent_check_critical_gap" and m.category_gap == 5


def test_gap_of_exactly_three_is_scored_not_critical():
    r = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), tc(row("COD", 8, 5)))
    m = r.matched_skills[0]
    assert not m.critical_gap and m.level_factor == 0.625 and r.match_score == 63


def test_gap_of_four_is_critical():
    r = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), tc(row("COD", 8, 4)))
    assert r.missing_skills and r.missing_skills[0].critical_gap


def test_no_gap_or_surplus_keeps_full_credit():
    r = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), tc(row("COD", 5, 9)))
    assert r.match_score == 100 and r.matched_skills[0].level_factor == 1.0


def test_unknown_category_rows_run_normal_matching():
    r = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), tc(row("SQL", 8, 1)))
    assert r.match_score == 100


def test_critical_stays_in_denominator():
    j = jd(sk("Python"), sk("Docker", "CLOUD"))
    r = match_with_talent_check_raw(cand(sk("Python"), sk("Docker", "CLOUD")), j, tc(row("CLOUD", 8, 2)))
    assert r.match_score == 50 and r.score_breakdown.total_required_weight == 2.0


def test_partial_is_scaled_too():
    r = match_with_talent_check_raw(cand(sk("Algorithms", "DSA")), jd(sk("Data Structures and Algorithms", "DSA")),
                                    tc(row("DSA", 8, 6)))
    assert r.partial_matches[0].contribution == 0.375 and r.match_score == 38


def test_readiness_is_informational_only():
    a = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), tc(row("COD", 5, 5), readiness=5))
    b = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), tc(row("COD", 5, 5), readiness=95))
    assert a.match_score == b.match_score == 100 and a.talent_check_context.readiness_score == 5


def test_without_talent_check_behaviour_unchanged():
    assert match_raw(cand(sk("Python")), jd(sk("Python"))).talent_check_context is None


def test_company_mismatch_warns():
    t = tc(row("COD", 5, 5)); t["company"] = "Other Corp"
    r = match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), t)
    assert any("differs" in w for w in r.warnings)


def test_bad_talent_check_rejected():
    with pytest.raises(InvalidInputError):
        match_with_talent_check_raw(cand(sk("Python")), jd(sk("Python")), {"skillset_gap": [{"category_code": "COD", "required_level": 99}]})


def test_api_endpoint(load):
    body = {**load("sample_match_request.json"), "talent_check": load("sample_talent_check.json")}
    r = client.post("/api/v1/matches/with-talent-check", json=body)
    assert r.status_code == 200
    d = r.json()
    assert {"jd_source_file", "match_score", "matched_skills", "missing_skills"} <= d.keys()
    assert "SYSD" in d["talent_check_context"]["critical_categories"]
    assert client.post("/api/v1/matches/with-talent-check", json=load("sample_match_request.json")).status_code == 400
