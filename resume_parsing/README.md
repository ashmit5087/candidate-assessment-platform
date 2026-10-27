# Resume Parsing (Role 2) — RADIX Talent Match

Resume (PDF/DOCX) in  ->  JSON skill list (shared ResumeExtract format) out.
Output goes to `output/<name>_pdf.json` / `output/<name>_docx.json` for Profile Builder.

## Setup (once)
    python -m venv venv
    venv\Scripts\activate            # Windows   (Mac/Linux: source venv/bin/activate)
    pip install -r requirements.txt
    copy .env.example .env           # Mac/Linux: cp .env.example .env  -> paste your Groq key

Put the 4 sample resumes (PDF + DOCX) in `samples/`.

## Run
    python read_file.py samples/anya_rao.pdf      # 1. text comes out?         (milestone 7)
    python extract.py samples/anya_rao.pdf        # 2. skills for one resume
    python parse_resume.py samples                # 3. all resumes -> output/  (milestone 8)
    python check_output.py                        # 4. format check + per-category counts

## Files
- schema.py        shared format — same copy as JD Analytics; change only together
- read_file.py     PDF/DOCX -> plain text
- extract.py       text -> Groq LLM -> ResumeExtract (retry once, removes duplicate skills)
- parse_resume.py  one file or a folder -> output/*.json
- check_output.py  validates output/ against schema.py
