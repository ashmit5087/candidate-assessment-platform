import asyncio
import json
import pytest
from app.adapters.resume_adapter import MockResumeAdapter


@pytest.fixture
def temp_mock_file(tmp_path):
    mock_file = tmp_path / "test_mock.json"
    data = {
        "mock-001": {
            "source_file": "rohan_cv.pdf",
            "candidate": {
                "name": "Rohan Verma",
                "email": "rohan.verma@example.com",
                "phone": "+91 9876543210",
                "location": "Mumbai",
                "summary": "Full Stack Dev",
            },
            "education": [{"institution": "IIT Bombay", "degree": "B.Tech", "field_of_study": "CS"}],
            "skills": [
                {"skill_name": "Python", "category_code": "COD", "confidence": "high", "evidence": "Django"},
                {"skill_name": "React", "category_code": "SWE", "confidence": "high", "evidence": "Frontend"},
                {"skill_name": "Algorithms", "category_code": "DSA", "confidence": "high", "evidence": "Leetcode"},
                {"skill_name": "Postgres", "category_code": "SQL", "confidence": "high", "evidence": "DB"},
                {"skill_name": "AWS", "category_code": "CLOUD", "confidence": "high", "evidence": "Cloud"},
                {"skill_name": "Design", "category_code": "SYSD", "confidence": "high", "evidence": "Arch"},
            ],
            "experience": [
                {"entry_type": "hackathon", "title": "Hackathon Winner", "organization": "Hackathon Org"},
                {"entry_type": "internship", "title": "Software Intern", "organization": "Tech Corp"}
            ],
            "certifications": [],
            "preferred_roles": ["Backend Developer"]
        },
        "mock-002": {
            "source_file": "ananya_cv.pdf",
            "candidate": {
                "name": "Ananya Rao",
                "email": "ananya.rao@example.com"
            },
            "education": [],
            "skills": [
                {"skill_name": "Networking", "category_code": "NETW", "confidence": "high", "evidence": "TCP/IP"},
                {"skill_name": "Linux", "category_code": "OS", "confidence": "high", "evidence": "Kernel"}
            ],
            "experience": [],
            "certifications": [],
            "preferred_roles": []
        }
    }
    mock_file.write_text(json.dumps(data), encoding="utf-8")
    return mock_file


def test_adapt_mock_001_rohan(temp_mock_file):
    async def _test():
        adapter = MockResumeAdapter(mock_file_path=temp_mock_file)
        profile_create = await adapter.adapt_to_profile("mock-001")

        assert profile_create.personal_info.full_name == "Rohan Verma"
        assert profile_create.personal_info.email == "rohan.verma@example.com"
        assert profile_create.personal_info.source == "extracted"

        # Verify skills
        assert len(profile_create.skills) >= 6
        for s in profile_create.skills:
            assert s.source == "extracted"
            assert s.category_code in [
                "COD", "DSA", "OOD", "APTI", "COMM", "AI",
                "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS", "OTHER"
            ]
            assert s.evidence
            assert s.confidence

        # Verify education
        assert len(profile_create.education) >= 1
        assert profile_create.education[0].source == "extracted"

        # Verify hackathons and internships split
        assert len(profile_create.hackathons) >= 1
        assert profile_create.hackathons[0].entry_type == "hackathon"
        assert len(profile_create.internships) >= 1
        assert profile_create.internships[0].entry_type == "internship"

    asyncio.run(_test())


def test_adapt_mock_002_ananya(temp_mock_file):
    async def _test():
        adapter = MockResumeAdapter(mock_file_path=temp_mock_file)
        profile_create = await adapter.adapt_to_profile("mock-002")

        assert profile_create.personal_info.full_name == "Ananya Rao"
        assert profile_create.personal_info.email == "ananya.rao@example.com"
        assert "NETW" in [s.category_code for s in profile_create.skills]
        assert "OS" in [s.category_code for s in profile_create.skills]

    asyncio.run(_test())


def test_adapt_unknown_resume_raises_error(temp_mock_file):
    async def _test():
        adapter = MockResumeAdapter(mock_file_path=temp_mock_file)
        with pytest.raises(KeyError):
            await adapter.adapt_to_profile("non_existent_resume_999")

    asyncio.run(_test())

