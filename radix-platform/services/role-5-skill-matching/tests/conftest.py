import json
from pathlib import Path
import pytest

def sk(name, cat="COD", evidence="used it in a project", conf="high"):
    d = {"skill_name": name, "category_code": cat}
    if evidence is not None:
        d["evidence"] = evidence
    if conf is not None:
        d["confidence"] = conf
    return d


def jd(*skills, source="test_jd.json"):
    return {"source_file": source, "company": "Test Co", "role": "Tester", "skills": list(skills)}


def cand(*skills):
    return {"name": "Test Candidate", "skills": list(skills)}


FIXTURES = {
    "sample_jd.json": {
        "source_file": "swe_jd.pdf", "company": "Tech Corp", "role": "SWE",
        "skills": [sk("Python", "COD"), sk("Go", "COD"), sk("PostgreSQL", "SQL"), sk("Distributed Systems", "SYSD")]
    },
    "sample_jd_data_role.json": {
        "source_file": "data_jd.pdf", "company": "Data Corp", "role": "Data Engineer",
        "skills": [sk("SQL", "SQL"), sk("Pandas", "AI"), sk("Airflow", "SWE")]
    },
    "sample_candidate.json": {
        "name": "SWE Candidate",
        "skills": [sk("Python", "COD"), sk("Go", "COD"), sk("Docker", "CLOUD")]
    },
    "sample_candidate_data.json": {
        "name": "Data Candidate",
        "skills": [sk("SQL", "SQL"), sk("Pandas", "AI"), sk("Airflow", "SWE")]
    },
    "sample_talent_check.json": {
        "company": "Tech Corp",
        "readiness_score": 76,
        "skillset_gap": [{"category_code": "SYSD", "required_level": 8, "candidate_level": 2, "gap": True}]
    }
}
FIXTURES["sample_match_request.json"] = {
    "candidate": FIXTURES["sample_candidate.json"],
    "job_description": FIXTURES["sample_jd.json"],
}


@pytest.fixture
def data_dir(tmp_path):
    d = tmp_path / "data"
    d.mkdir(parents=True, exist_ok=True)
    for name, content in FIXTURES.items():
        (d / name).write_text(json.dumps(content), encoding="utf-8")
    return d


@pytest.fixture
def load(data_dir):
    def _load(name):
        return json.loads((data_dir / name).read_text(encoding="utf-8"))
    return _load
