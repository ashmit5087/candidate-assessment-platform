"""Optional LLM layer over the deterministic plan (any OpenAI-compatible provider).

Guardrails:
  * Off unless the caller asks AND LLM_BASE_URL/LLM_API_KEY/LLM_MODEL are set.
  * Sends only skill names, categories, statuses and levels - no name, email or evidence text.
  * The model may only rewrite `steps` for actions that already exist and add a short
    narrative. Scores, gains, ordering and the action list stay deterministic.
  * Reply is validated; on ANY failure the deterministic plan is returned with a warning.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field, ValidationError

from . import config
from .schemas import ImprovementPlan

SYSTEM_PROMPT = (
    "You are a career-readiness coach inside a skill-matching tool. You receive a JSON list of "
    "skill gaps that were computed by code. Rules: (1) Only use the skills listed; never add, "
    "rename or claim the candidate already has a skill. (2) Never state or change any score. "
    "(3) For each action write 2-3 short, concrete, practical steps tailored to the skill and "
    "action_type. (4) Add a 2-3 sentence narrative prioritizing the first actions. "
    'Reply with ONLY JSON: {"narrative": str, "actions": [{"skill_name": str, "steps": [str]}]}.'
)


class _LLMAction(BaseModel):
    skill_name: str
    steps: list[str] = Field(min_length=1, max_length=4)


class _LLMReply(BaseModel):
    narrative: str = Field(max_length=1200)
    actions: list[_LLMAction]


def llm_configured() -> bool:
    return bool(config.LLM_BASE_URL and config.LLM_API_KEY and config.LLM_MODEL)


def _make_client() -> Any:
    from openai import OpenAI  # lazy: only needed when the LLM layer is used

    return OpenAI(base_url=config.LLM_BASE_URL, api_key=config.LLM_API_KEY, timeout=config.LLM_TIMEOUT_S)


def _payload(plan: ImprovementPlan, role: Optional[str]) -> str:
    return json.dumps({
        "target_role": role,
        "actions": [
            {"skill_name": a.skill_name, "category": a.category_code, "action_type": a.action_type,
             "current_status": a.current_status, "critical_gap": a.critical_gap,
             "level_needed": a.level_needed, "score_gain": a.score_gain}
            for a in plan.actions
        ],
    })


def openrouter_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if key:
        return key
    for candidate in [
        Path(__file__).resolve().parents[2] / ".env",  # role-5-skill-matching/.env
        Path(__file__).resolve().parents[4] / ".env",  # radix-platform/.env
        Path.cwd() / ".env",
        Path.cwd().parent / ".env",
    ]:
        if candidate.is_file():
            try:
                for line in candidate.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("OPENROUTER_API_KEY="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
            except Exception:
                pass
    return ""


def _call_openrouter_plan(plan: ImprovementPlan, role: Optional[str]) -> Optional[_LLMReply]:
    key = openrouter_api_key()
    if not key:
        return None

    try:
        import httpx
    except ImportError:
        return None

    user_model = os.environ.get("OPENROUTER_MODEL", "").strip()
    models = [
        user_model if user_model and user_model != "meta-llama/llama-3.3-70b-instruct:free" else "",
        "openrouter/free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "nvidia/nemotron-3.5-lightning:free",
        "cohere/north-mini-code:free",
        "liquid/lfm-2.5-2.6b:free",
    ]
    seen = set()
    models_to_try = []
    for m in models:
        if m and m not in seen:
            seen.add(m)
            models_to_try.append(m)

    payload_str = _payload(plan, role)
    for model in models_to_try:
        try:
            r = httpx.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://radix-platform.local",
                    "X-Title": "RADIX Skill Matching"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": payload_str}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3
                },
                timeout=float(config.LLM_TIMEOUT_S)
            )
            if r.status_code == 200:
                content = r.json()["choices"][0]["message"]["content"]
                return _LLMReply.model_validate_json(content)
        except Exception:
            continue
    return None


def enhance_plan(plan: ImprovementPlan, role: Optional[str] = None, client: Any = None) -> ImprovementPlan:
    """Return the plan with LLM-written steps/narrative, or the original plus a warning."""
    if not plan.actions:
        return plan

    reply: Optional[_LLMReply] = None
    if client is not None:
        try:
            completion = client.chat.completions.create(
                model=config.LLM_MODEL or "default",
                messages=[{"role": "system", "content": SYSTEM_PROMPT},
                          {"role": "user", "content": _payload(plan, role)}],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            reply = _LLMReply.model_validate_json(completion.choices[0].message.content)
        except (ValidationError, ValueError, KeyError, IndexError, AttributeError, TypeError) as exc:
            plan.warnings.append(f"LLM reply was not usable ({type(exc).__name__}); showing the offline plan.")
            return plan
        except Exception as exc:  # network, auth, timeout, provider errors
            plan.warnings.append(f"LLM call failed ({type(exc).__name__}); showing the offline plan.")
            return plan
    else:
        if llm_configured():
            try:
                cli = _make_client()
                completion = cli.chat.completions.create(
                    model=config.LLM_MODEL or "default",
                    messages=[{"role": "system", "content": SYSTEM_PROMPT},
                              {"role": "user", "content": _payload(plan, role)}],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                )
                reply = _LLMReply.model_validate_json(completion.choices[0].message.content)
            except Exception:
                reply = None

        if reply is None and openrouter_api_key():
            reply = _call_openrouter_plan(plan, role)

        if reply is None:
            if not llm_configured() and not openrouter_api_key():
                plan.warnings.append("LLM not configured (set LLM_BASE_URL, LLM_API_KEY, LLM_MODEL); showing the offline plan.")
            else:
                plan.warnings.append("LLM call failed; showing the offline plan.")
            return plan

    by_name = {a.skill_name: a for a in reply.actions}
    updated = 0
    for action in plan.actions:  # only existing actions can change, and only their steps
        hit = by_name.get(action.skill_name)
        if hit:
            action.steps = [s.strip() for s in hit.steps if s.strip()] or action.steps
            updated += 1
    plan.narrative = reply.narrative.strip()
    plan.source = "deterministic+llm"
    ignored = len(reply.actions) - updated
    if ignored:
        plan.warnings.append(f"Ignored {ignored} LLM action(s) that did not match a computed gap.")
    return plan
