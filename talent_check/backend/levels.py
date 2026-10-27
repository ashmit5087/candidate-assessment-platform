"""
levels.py - Layer A of Talent Check
Derives candidate skill levels (0-10) across the 12 RADIX categories
using an evidence-points aggregator and a saturating exponential curve.
"""

import math
import re
from typing import Dict, Any, List, Tuple, Union

CATEGORIES = [
    "COD", "DSA", "OOD", "APTI", "COMM", "AI",
    "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS"
]

# Evidence points scoring scheme
CONFIDENCE_POINTS = {
    "high": 1.0,
    "medium": 0.6,
    "low": 0.3,
}

INTERNSHIP_POINTS = 1.5
HACKATHON_POINTS = 1.0
CERTIFICATION_POINTS = 1.0
PROJECT_POINTS = 1.0

# Default saturation parameter: level = round(10 * (1 - exp(-points / k)))
DEFAULT_K = 4.0

# Free-text keyword map for assigning categories to internships, hackathons, certs, and projects
KEYWORD_MAP: Dict[str, List[str]] = {
    "COD": [
        r"\bpython\b", r"\bjava\b", r"\bc\+\+\b", r"\bgolang\b", r"\bgo\b",
        r"\brust\b", r"\bjavascript\b", r"\btypescript\b", r"\bc#\b",
        r"\bscripting\b", r"\bcoding\b", r"\bprogramming\b"
    ],
    "DSA": [
        r"\bdsa\b", r"\bdata structures?\b", r"\balgorithms?\b", r"\bleetcode\b",
        r"\bcodeforces\b", r"\bcompetitive programming\b", r"\bdynamic programming\b",
        r"\bgraphs?\b", r"\btrees?\b", r"\bsorting\b", r"\bhashing\b"
    ],
    "OOD": [
        r"\bobject[- ]oriented\b", r"\bood\b", r"\boop\b", r"\bdesign patterns?\b",
        r"\bsolid principles?\b", r"\bsolid\b", r"\bclean architecture\b", r"\buml\b",
        r"\bclass diagrams?\b"
    ],
    "APTI": [
        r"\baptitude\b", r"\bproblem[- ]solving\b", r"\banalytical\b", r"\banalytics\b",
        r"\bstatistics\b", r"\bstatistical\b", r"\bbayesian\b", r"\ba/b testing\b",
        r"\bquantitative\b", r"\blogic\b", r"\breasoning\b"
    ],
    "COMM": [
        r"\bcommunication\b", r"\bpresentation\b", r"\bpresented\b", r"\bleadership\b",
        r"\bled\b", r"\bmentored\b", r"\bworkshops?\b", r"\bdocumentation\b",
        r"\bservice desk\b", r"\bhelpdesk\b", r"\btickets?\b", r"\bescalation\b",
        r"\bsla\b", r"\bclient\w*\b", r"\bstakeholders?\b"
    ],
    "AI": [
        r"\bai\b", r"\bml\b", r"\bmachine learning\b", r"\bdeep learning\b",
        r"\bllm\w*\b", r"\brag\b", r"\bnlp\b", r"\bcomputer vision\b",
        r"\blangchain\b", r"\bllamaindex\b", r"\bpytorch\b", r"\btensorflow\b",
        r"\bgenai\b", r"\bneural networks?\b", r"\btransformers?\b"
    ],
    "CLOUD": [
        r"\bcloud\b", r"\baws\b", r"\bazure\b", r"\bgcp\b", r"\bdocker\b",
        r"\bkubernetes\b", r"\bk8s\b", r"\bterraform\b", r"\bdevops\b",
        r"\bci/cd\b", r"\bhelm\b", r"\bserverless\b"
    ],
    "SQL": [
        r"\bsql\b", r"\bpostgres\w*\b", r"\bmysql\b", r"\boracle\b",
        r"\bdatabase\w*\b", r"\brdbms\b", r"\bquery\b", r"\bqueries\b",
        r"\bbigquery\b", r"\bsnowflake\b", r"\bdatabricks\b", r"\bpl/sql\b",
        r"\betl\b", r"\bdata warehouse\b"
    ],
    "SWE": [
        r"\bsoftware engineering\b", r"\bgit\b", r"\bgithub\b", r"\btesting\b",
        r"\bqa\b", r"\bunit test\w*\b", r"\bpytest\b", r"\bjunit\b",
        r"\bjira\b", r"\bagile\b", r"\bscrum\b", r"\bfull[- ]stack\b",
        r"\bmicroservices?\b", r"\brest\b", r"\bapi\w*\b", r"\bsdlc\b"
    ],
    "SYSD": [
        r"\bsystem design\b", r"\bdistributed systems?\b", r"\bscalability\b",
        r"\bcaching\b", r"\bredis\b", r"\bkafka\b", r"\bmessage queue\w*\b",
        r"\bload balanc\w*\b", r"\braft\b", r"\bhigh availability\b", r"\blow[- ]latency\b"
    ],
    "NETW": [
        r"\bnetwork\w*\b", r"\btcp\b", r"\budp\b", r"\btcp/ip\b", r"\bhttp\w*\b",
        r"\bdns\b", r"\bvpn\w*\b", r"\bebpf\b", r"\bwebsocket\w*\b",
        r"\btls\b", r"\bsockets?\b", r"\bpackets?\b", r"\brouting\b"
    ],
    "OS": [
        r"\boperating systems?\b", r"\bos\b", r"\blinux\b", r"\bunix\b",
        r"\bkernel\b", r"\bposix\b", r"\bconcurrency\b", r"\bmultithreading\b",
        r"\bthreads?\b", r"\bprocesses\b", r"\bipc\b", r"\bmemory management\b",
        r"\bxv6\b", r"\bbash\b", r"\bshell\b"
    ]
}

COMPILED_KEYWORDS = {
    cat: [re.compile(pat, re.IGNORECASE) for pat in patterns]
    for cat, patterns in KEYWORD_MAP.items()
}

def extract_text(item: Any) -> str:
    """Recursively concatenates all string/text values from item for keyword search."""
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return " ".join(str(v) for v in item.values() if isinstance(v, (str, int, float)))
    if isinstance(item, list):
        return " ".join(extract_text(sub) for sub in item)
    return ""

def item_matches_category(cat: str, item: Any) -> bool:
    """
    Checks if an internship, hackathon, certification, or project matches category 'cat'.
    Supports explicit category tags or fallback keyword matching.
    """
    cat_upper = cat.upper()
    if isinstance(item, dict):
        code = item.get("category_code") or item.get("category")
        if code and str(code).upper() == cat_upper:
            return True
        cats = item.get("categories") or item.get("tags")
        if isinstance(cats, list) and cat_upper in [str(c).upper() for c in cats]:
            return True
    
    text = extract_text(item)
    return any(p.search(text) for p in COMPILED_KEYWORDS.get(cat_upper, []))

def derive_evidence_points(profile: Dict[str, Any]) -> Dict[str, float]:
    """
    Calculates evidence points per category across all sources in profile:
      - Skills (direct category_code from Role 1/2): high=1.0, medium=0.6, low=0.3
      - Internships matching category: +1.5
      - Hackathons matching category: +1.0
      - Certifications matching category: +1.0
      - Projects matching category: +1.0
    """
    points = {cat: 0.0 for cat in CATEGORIES}

    # 1. Skills
    for s in profile.get("skills", []):
        cat = s.get("category_code")
        if cat in points:
            conf = str(s.get("confidence", "medium")).lower()
            pts = CONFIDENCE_POINTS.get(conf, 0.6)
            points[cat] += pts

    # 2. Internships (+1.5)
    for intern in profile.get("internships", []):
        for cat in CATEGORIES:
            if item_matches_category(cat, intern):
                points[cat] += INTERNSHIP_POINTS

    # 3. Hackathons (+1.0)
    for hack in profile.get("hackathons", []):
        for cat in CATEGORIES:
            if item_matches_category(cat, hack):
                points[cat] += HACKATHON_POINTS

    # 4. Certifications (+1.0)
    for cert in profile.get("certifications", []):
        for cat in CATEGORIES:
            if item_matches_category(cat, cert):
                points[cat] += CERTIFICATION_POINTS

    # 5. Projects (+1.0)
    for proj in profile.get("projects", []):
        for cat in CATEGORIES:
            if item_matches_category(cat, proj):
                points[cat] += PROJECT_POINTS

    return {cat: round(val, 2) for cat, val in points.items()}

def points_to_level(points: float, k: float = DEFAULT_K) -> int:
    """
    Converts evidence points to a 0-10 level using a saturating exponential curve:
      level = round(10 * (1 - exp(-points / k)))
    Clamped to range [0, 10].
    """
    if points <= 0.0:
        return 0
    calc = 10.0 * (1.0 - math.exp(-points / float(k)))
    level = int(round(calc))
    return max(0, min(10, level))

def get_candidate_levels_with_points(
    profile: Dict[str, Any],
    k: float = DEFAULT_K
) -> Tuple[Dict[str, int], Dict[str, float]]:
    """
    Returns both derived levels (0-10) and the raw evidence points per category.
    """
    points = derive_evidence_points(profile)
    levels = {cat: points_to_level(points[cat], k) for cat in CATEGORIES}
    return levels, points

def get_candidate_levels(profile: Dict[str, Any], k: float = DEFAULT_K) -> Dict[str, int]:
    """
    Layer A extraction:
    Derives candidate levels (0-10) using evidence points and the saturating curve.
    """
    levels, _ = get_candidate_levels_with_points(profile, k)
    return levels
