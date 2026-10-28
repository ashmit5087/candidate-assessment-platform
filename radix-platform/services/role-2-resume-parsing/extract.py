import os
import sys
import time
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from read_file import read_resume
from schema import CATEGORY_NAMES, ResumeExtract, Skill

load_dotenv()

MIN_SKILLS = 1


# What the LLM fills in. File name / source type are set by our code,
# not the LLM, so it can't get them wrong.
class LLMResumeOutput(BaseModel):
    skills: List[Skill]
    education: Optional[str] = Field(None, description="Highest degree, college, year/CGPA if shown")
    projects: List[str] = Field(default_factory=list, description="One line per project")
    experience: List[str] = Field(default_factory=list, description="One line per job/internship")
    certifications: List[str] = Field(default_factory=list, description="One line per certificate or course")


CATEGORY_LIST = "\n".join(f"- {code}: {name}" for code, name in CATEGORY_NAMES.items())

SYSTEM_PROMPT = f"""
You extract skills from a candidate's resume.

Tag every skill with exactly ONE category code from this list:
{CATEGORY_LIST}

Which category to use (follow this so the same skill always gets the same code):
- COD:   programming languages and general coding libraries
         (C++, Java, Python, Go, JavaScript, TypeScript, Bash, pandas, NumPy)
- DSA:   data structures, algorithms, competitive programming
- OOD:   object-oriented design, OOP, design patterns, SOLID
- APTI:  statistics, probability, quantitative / logical reasoning, A/B testing
- COMM:  presenting, explaining to non-technical people, mentoring, coordinating teams,
         technical writing, publications
- AI:    machine learning, deep learning, NLP, computer vision, OCR, predictive models,
         feature engineering, recommendation systems, anomaly detection, AND every
         ML / DL library (scikit-learn, PyTorch, TensorFlow, Keras, XGBoost, LightGBM,
         Hugging Face, OpenCV, BERT), AND MLOps tools (MLflow, Kubeflow, DVC,
         model monitoring, feature stores, model registry)
- CLOUD: AWS, Azure, GCP and their services, Docker, Kubernetes, Terraform, serverless, deployment
- SQL:   SQL and every database or data store, relational or NoSQL (MySQL, PostgreSQL,
         MongoDB, Redis, Elasticsearch, Cassandra), database / schema design, normalization
- SWE:   web and backend frameworks (React, Node.js, Express, Django, Flask, FastAPI,
         Spring Boot), APIs (REST, GraphQL, gRPC, WebSockets), Git, testing (unit tests,
         PyTest, Jest), CI/CD tools (GitHub Actions, Jenkins), Agile / Scrum, code review,
         microservices, troubleshooting, debugging
- SYSD:  system design, distributed / scalable systems, caching, pub-sub, rate limiting,
         streaming and big-data tools (Kafka, Spark, Airflow, Celery, RabbitMQ), autoscaling
- NETW:  computer networks, TCP/IP, HTTP, networking certifications
- OS:    operating systems, Linux, processes, threads, multithreading, scheduling
- OTHER: ONLY when none of the above fits (Excel, Power BI, Figma, Mapbox, ticketing tools)

Resume sections. Headings differ from resume to resume (and some resumes have none),
so go by what a section is ABOUT, not its exact name. Common headings for each:

FILL "education" from:
  Education, Academic Background, Academics, Qualifications, Educational Qualifications,
  Academic Details, Studies, Schooling, Degree, Coursework, Relevant Coursework
  (if there are several degrees, give the highest one)

FILL "experience" from (one line per role):
  Experience, Work Experience, Professional Experience, Employment History, Work History,
  Internships, Internship Experience, Industrial Training, Training, Where I've Worked,
  Positions of Responsibility, Leadership, Volunteer Work, Freelance

FILL "projects" from (one line per project):
  Projects, Academic Projects, Personal Projects, Key Projects, Major / Minor Project,
  Capstone, Final Year Project, Things I've Built, Portfolio, Research, Publications,
  Hackathons (when something was built)

FILL "certifications" from (one line per certificate, with issuer and year if shown):
  Certifications, Certificates, Licenses, Courses, Online Courses, MOOCs, NPTEL, Coursera,
  Udemy, and any certificate listed under Achievements
  (awards, hackathon positions and papers are NOT certificates)

TAKE SKILLS FROM all of the above AND from:
  Skills, Technical Skills, Core Competencies, Key Skills, Areas of Expertise, Tech Stack,
  Tools, Technologies, Toolbox, Programming Languages, Frameworks, Software, Strengths,
  Certifications, Courses, Licenses, Online Courses, Achievements, Accomplishments, Awards,
  Honors, Competitive Programming, Coding Profiles, Open Source, Extra-curricular,
  Summary, Profile, Objective, About Me (only skills that are actually shown)

DO NOT TAKE SKILLS FROM (personal, not job skills):
  Hobbies, Interests, Hobbies & Interests, Languages Spoken / Known (English, Hindi...),
  Personal Details, Contact, Date of Birth, Nationality, Marital Status, Address,
  References, Declaration, Preferred Roles, Career Goals
  e.g. "chess", "cricket", "travelling", "music" are NOT skills.

Rules:
1. Only include skills the resume actually shows. Never guess or add extras.
2. Include named technologies AND broader skills shown by the work
   (e.g. "shipped a rate-limiter" -> "Rate limiting" SYSD).
3. "skill_name" must be a short skill or technology (1-4 words), e.g. "Rate limiting",
   not a project title like "Built a rate-limiter". Never use a person's role or an award as a skill.
   Never use a certificate or course title as a skill: put the title in "certifications" and
   add only the skill it shows (e.g. "Postman API Fundamentals Student Expert" -> "Postman" SWE,
   "Introduction to Database Systems" -> "Database systems" SQL).
4. "evidence": an exact short quote (under 15 words) from the resume. The quote must
   mention or clearly show THIS skill. For a skills list, quote only that one item
   (e.g. "Linux"), not the whole line.
5. "confidence":
   - high   = the evidence comes from a project, internship, job or achievement
   - medium = only listed in the skills or certifications section
   - low    = only weakly hinted at
   If a skill is both listed and used in a project, use high and quote the project.
6. Do not repeat the same skill twice.
7. Resumes are messy and laid out differently. Read every section (projects, internships,
   hackathons, certifications, achievements), not just the skills list.
8. Go through EVERY project and internship bullet one by one and add the skills it shows.
   Do not stop after the skills section.
9. "Relevant Coursework" subjects count as skills with medium confidence. Include ALL of
   them (e.g. Operating Systems -> OS, Computer Networks -> NETW), not just some.
10. Topics under "Interests" or "Technical Interests" are NOT skills unless the resume
    also shows them being used somewhere else.
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "Resume text:\n\n{resume_text}"),
])


TOKEN_LIMIT = 8000  # Groq free tier: max tokens per minute (prompt + resume + reply)


def reply_space(resume_text: str) -> int:
    """How many tokens the LLM may use for its reply.
    Groq counts prompt + resume + reply against the free-tier limit, so a long
    resume leaves less room for the reply. (1 token is roughly 4 characters.)"""
    used = (len(SYSTEM_PROMPT) + len(resume_text)) // 3  # rounded up to be safe
    return max(2500, min(6000, TOKEN_LIMIT - 500 - used))


def api_keys() -> List[str]:
    """All Groq keys from .env (GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3).
    Empty ones are skipped, so 1, 2 or 3 keys all work."""
    names = ["GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]
    keys = [os.getenv(n, "").strip() for n in names]
    keys = [k for k in keys if k]
    if not keys:
        raise RuntimeError("GROQ_API_KEY missing. Add it to your .env file.")
    return keys


def get_chain(resume_text: str = "", api_key: Optional[str] = None):
    llm = ChatGroq(
        api_key=api_key or api_keys()[0],
        model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        temperature=0,  # same input -> same output, easier to debug
        # gpt-oss "thinks" before answering, and the thinking uses reply space.
        # "low" leaves enough room for the answer within the free-tier limit;
        # with too little room it returns nothing or only a few skills.
        max_tokens=reply_space(resume_text),
        reasoning_effort="low",
    )
    # json_schema = Groq forces the reply to match our format exactly
    # (more reliable than the default "tool call" mode for this model)
    return prompt | llm.with_structured_output(LLMResumeOutput, method="json_schema", strict=True)


def openrouter_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if key:
        return key
    # Check parent directory radix-platform/.env
    parent_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if parent_env.exists():
        try:
            from dotenv import dotenv_values
            vals = dotenv_values(parent_env)
            val = (vals.get("OPENROUTER_API_KEY") or "").strip()
            if val:
                return val
        except Exception:
            pass
    return ""


def call_openrouter(text: str) -> LLMResumeOutput:
    import json
    import re
    import httpx

    key = openrouter_api_key()
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is missing. Add it to .env.")

    user_model = os.getenv("OPENROUTER_MODEL", "").strip()
    free_models = [
        user_model if user_model and user_model != "meta-llama/llama-3.3-70b-instruct:free" else "",
        "openrouter/free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "nvidia/nemotron-3.5-lightning:free",
        "cohere/north-mini-code:free",
        "liquid/lfm-2.5-2.6b:free",
    ]
    seen = set()
    models = []
    for m in free_models:
        if m and m not in seen:
            seen.add(m)
            models.append(m)

    schema_str = json.dumps(LLMResumeOutput.model_json_schema())
    augmented_system = (
        SYSTEM_PROMPT +
        "\n\nIMPORTANT: You must return valid JSON strictly conforming to this schema:\n" +
        schema_str
    )

    last_error = None
    for model in models:
        try:
            print(f"  [Role 2] Attempting OpenRouter fallback with model: {model}")
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": augmented_system},
                    {"role": "user", "content": f"Resume text:\n\n{text}"}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.0
            }
            r = httpx.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://radix-platform.local",
                    "X-Title": "RADIX Resume Parsing"
                },
                json=payload,
                timeout=45.0
            )
            if r.status_code == 200:
                data = r.json()
                raw = data["choices"][0]["message"]["content"]
                cleaned = raw.strip()
                cleaned = re.sub(r"^```(?:json)?|```$", "", cleaned, flags=re.MULTILINE).strip()
                parsed_json = json.loads(cleaned)
                if isinstance(parsed_json, dict) and "skills" in parsed_json:
                    for s in parsed_json.get("skills", []):
                        if isinstance(s, dict) and "category_code" in s:
                            cat = str(s["category_code"]).upper().strip()
                            if cat not in CATEGORY_NAMES:
                                s["category_code"] = "OTHER"
                result = LLMResumeOutput.model_validate(parsed_json)
                if len(result.skills) >= MIN_SKILLS:
                    print(f"  [SUCCESS] OpenRouter ({model}) extracted {len(result.skills)} skills.")
                    return result
                else:
                    print(f"  OpenRouter ({model}) returned only {len(result.skills)} skills; trying next model...")
                    last_error = ValueError(f"OpenRouter ({model}) output had only {len(result.skills)} skills")
            elif r.status_code == 429:
                print(f"  OpenRouter ({model}) rate limit 429, trying next model...")
                last_error = RuntimeError(f"OpenRouter ({model}) rate limit")
            else:
                print(f"  OpenRouter ({model}) failed with status {r.status_code}: {r.text[:120]}")
                last_error = RuntimeError(f"OpenRouter ({model}) status {r.status_code}")
        except Exception as exc:
            print(f"  OpenRouter ({model}) error: {exc}")
            last_error = exc

    raise RuntimeError(f"OpenRouter fallback failed: {last_error}")


def call_llm(text: str, tries: int = 3) -> LLMResumeOutput:
    """Groq sometimes returns badly-formed output, or hits the free-tier
    rate limit. On a rate limit, switch to the next API key straight away;
    only wait when every key is rate-limited. If Groq fails completely or is
    unconfigured, automatically fall back to OpenRouter free models."""
    keys = []
    try:
        keys = api_keys()
    except Exception as e:
        print(f"  Groq keys not found ({e}). Checking OpenRouter fallback...")

    if keys:
        chains = [get_chain(text, k) for k in keys]
        current = 0
        limited = set()
        total_tries = tries * len(keys)
        last_error = None
        for attempt in range(1, total_tries + 1):
            try:
                result = chains[current].invoke({"resume_text": text})
                if len(result.skills) < MIN_SKILLS:
                    raise ValueError(f"only {len(result.skills)} skills returned, looks cut short")
                return result
            except Exception as e:
                last_error = e
                print(f"  LLM attempt {attempt} (key {current + 1}) failed: {str(e)[:120]}")
                if attempt == total_tries:
                    break
                is_rate_limit = "rate_limit" in str(e) or "429" in str(e) or "413" in str(e)
                if is_rate_limit:
                    limited.add(current)
                    if len(limited) < len(keys):
                        current = (current + 1) % len(keys)
                        while current in limited:
                            current = (current + 1) % len(keys)
                        print(f"  switching to key {current + 1}")
                    else:
                        print("  all Groq keys rate-limited. Trying OpenRouter fallback...")
                        break
                else:
                    time.sleep(1)

        print(f"  Groq attempts exhausted ({last_error}). Falling back to OpenRouter...")

    # OpenRouter fallback
    if openrouter_api_key():
        try:
            return call_openrouter(text)
        except Exception as o_err:
            print(f"  OpenRouter fallback failed: {o_err}")
            raise RuntimeError(f"All LLMs (Groq and OpenRouter) failed: {o_err}")

    raise RuntimeError("No LLM available. Please configure GROQ_API_KEY or OPENROUTER_API_KEY in .env.")



def remove_duplicates(skills: List[Skill]) -> List[Skill]:
    """The LLM sometimes lists the same skill twice ("Python" and "python").
    Keep the copy with the highest confidence."""
    rank = {"high": 3, "medium": 2, "low": 1}
    best = {}
    for s in skills:
        key = s.skill_name.strip().lower()
        if key not in best or rank[s.confidence] > rank[best[key].confidence]:
            best[key] = s
    return list(best.values())


def extract_resume(file_path: str) -> ResumeExtract:
    text = read_resume(file_path)
    result = call_llm(text)

    return ResumeExtract(
        source_file=Path(file_path).name,  # file name only, never full path
        skills=remove_duplicates(result.skills),
        education=result.education,
        projects=result.projects,
        experience=result.experience,
        certifications=result.certifications,
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract.py <resume.pdf|resume.docx>")
        sys.exit(1)

    extract = extract_resume(sys.argv[1])
    print(extract.model_dump_json(indent=2))
    print(f"\n--- {len(extract.skills)} skills found ---")
