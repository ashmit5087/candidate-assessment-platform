"""LLM provider integration (isolated).

The rest of the app only knows the small `LLMClient` interface and the `LLM*Error` classes.
Supports Google Gemini, Groq, and automatic fallback from Gemini to Groq (using Role 2 keys).
"""
import json
import logging
import re
from typing import Protocol, Type

import httpx
from pydantic import BaseModel

from app.config import Settings

logger = logging.getLogger("radix.llm")


class LLMError(Exception):
    """Base class. Messages are safe to show; they never contain keys or stack traces."""


class LLMNotConfiguredError(LLMError): ...
class LLMAuthError(LLMError): ...
class LLMRateLimitError(LLMError): ...   # transient
class LLMTimeoutError(LLMError): ...     # transient
class LLMUnavailableError(LLMError): ... # transient
class LLMBadResponseError(LLMError): ...

TRANSIENT_ERRORS = (LLMRateLimitError, LLMTimeoutError, LLMUnavailableError)


class LLMClient(Protocol):
    provider_name: str
    model_name: str

    def generate_json(self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]) -> str:
        """Return the model's reply as a JSON string matching `response_model`."""
        ...


CATEGORY_MAP = {
    "COD": "COD", "CODING": "COD", "PROGRAMMING": "COD", "PYTHON": "COD", "JAVA": "COD", "C++": "COD",
    "DSA": "DSA", "ALGORITHM": "DSA", "DATA STRUCTURES": "DSA",
    "OOD": "OOD", "OBJECT ORIENTED": "OOD",
    "APTI": "APTI", "APTITUDE": "APTI", "PROBLEM SOLVING": "APTI",
    "COMM": "COMM", "COMMUNICATION": "COMM", "SOFT SKILL": "COMM", "SOFT_SKILL": "COMM", "TEAMWORK": "COMM",
    "AI": "AI", "MACHINE LEARNING": "AI", "ML": "AI", "STATISTICS": "AI", "DATA SCIENCE": "AI",
    "CLOUD": "CLOUD", "AWS": "CLOUD", "AZURE": "CLOUD", "GCP": "CLOUD",
    "SQL": "SQL", "DATABASE": "SQL", "DATABASES": "SQL", "DATA_MODELING": "SQL", "DATA MODELING": "SQL",
    "SWE": "SWE", "SOFTWARE ENGINEERING": "SWE", "DATA_VISUALIZATION": "SWE",
    "SYSD": "SYSD", "SYSTEM DESIGN": "SYSD",
    "NETW": "NETW", "NETWORKING": "NETW",
    "OS": "OS", "OPERATING SYSTEMS": "OS", "LINUX": "OS",
    "OTHER": "OTHER"
}


def normalize_extraction_json(raw_text: str) -> str:
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?|```$", "", cleaned, flags=re.MULTILINE).strip()
    try:
        data = json.loads(cleaned)
    except Exception:
        return raw_text
    if isinstance(data, dict):
        skills = data.get("skills", [])
        if isinstance(skills, list):
            for s in skills:
                if isinstance(s, dict):
                    cat = str(s.get("category_code", "")).upper().strip()
                    s["category_code"] = CATEGORY_MAP.get(cat, CATEGORY_MAP.get(cat.replace("_", " "), "OTHER"))
                    conf = str(s.get("confidence", "")).lower().strip()
                    if conf not in ("high", "medium", "low"):
                        s["confidence"] = "medium"
        return json.dumps(data)
    return raw_text


class GeminiClient:
    provider_name = "gemini"

    def __init__(self, api_key: str, model: str, timeout_seconds: float):
        from google import genai
        from google.genai import types

        self.model_name = model
        self._types = types
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=int(timeout_seconds * 1000)),
        )

    def generate_json(self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]) -> str:
        from google.genai import errors as genai_errors

        config = self._types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=response_model,  # provider-side structured output
            temperature=0.0,
        )
        try:
            response = self._client.models.generate_content(
                model=self.model_name, contents=user_prompt, config=config
            )
        except genai_errors.APIError as exc:
            raise self._map_api_error(exc) from None
        except (httpx.TimeoutException, TimeoutError):
            raise LLMTimeoutError("The LLM provider timed out.") from None
        except httpx.HTTPError:
            raise LLMUnavailableError("Could not reach the LLM provider.") from None
        except Exception as exc:  # unknown SDK failure: log the type only, not the message
            logger.error("Unexpected Gemini client failure: %s", type(exc).__name__)
            raise LLMUnavailableError("The LLM provider call failed unexpectedly.") from None

        text = getattr(response, "text", None)
        if not text:
            raise LLMBadResponseError("The LLM returned an empty or blocked response.")
        return text

    @staticmethod
    def _map_api_error(exc) -> LLMError:
        code = getattr(exc, "code", None)
        message = str(getattr(exc, "message", "") or "").lower()
        if code in (401, 403) or (code == 400 and "api key" in message):
            return LLMAuthError("The LLM provider rejected the API key.")
        if code == 429:
            return LLMRateLimitError("The LLM provider rate limit was hit.")
        if code in (408, 504):
            return LLMTimeoutError("The LLM provider timed out.")
        if isinstance(code, int) and code >= 500:
            return LLMUnavailableError("The LLM provider is temporarily unavailable.")
        return LLMBadResponseError("The LLM provider rejected the request.")


class GroqClient:
    provider_name = "groq"

    def __init__(self, api_keys: list[str], model: str = "openai/gpt-oss-120b", timeout_seconds: float = 30.0):
        self.api_keys = [k.strip() for k in api_keys if k and k.strip()]
        self.model_name = model
        self.timeout_seconds = timeout_seconds

    def generate_json(self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]) -> str:
        if not self.api_keys:
            raise LLMNotConfiguredError("No Groq API keys configured. Set GROQ_API_KEY.")

        augmented_system = (
            system_prompt +
            "\n\nIMPORTANT: You must return valid JSON conforming to this schema:\n" +
            json.dumps(response_model.model_json_schema())
        )
        last_error = None
        for i, key in enumerate(self.api_keys):
            try:
                payload = {
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": augmented_system},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.0
                }
                r = httpx.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=self.timeout_seconds
                )
                if r.status_code == 200:
                    raw_content = r.json()["choices"][0]["message"]["content"]
                    return normalize_extraction_json(raw_content)
                elif r.status_code == 429:
                    logger.warning("Groq key %d hit rate limit (429)", i + 1)
                    last_error = LLMRateLimitError(f"Groq key {i+1} rate limited")
                elif r.status_code in (401, 403):
                    logger.warning("Groq key %d rejected (auth)", i + 1)
                    last_error = LLMAuthError(f"Groq key {i+1} rejected")
                else:
                    logger.warning("Groq key %d failed with status %d: %s", i + 1, r.status_code, r.text[:120])
                    last_error = LLMUnavailableError(f"Groq status {r.status_code}")
            except (httpx.TimeoutException, TimeoutError):
                logger.warning("Groq key %d timed out", i + 1)
                last_error = LLMTimeoutError(f"Groq key {i+1} timed out")
            except Exception as e:
                logger.warning("Groq key %d error: %s", i + 1, e)
                last_error = LLMUnavailableError(f"Groq error: {e}")

        raise last_error or LLMUnavailableError("All Groq API keys failed.")


class OpenRouterClient:
    provider_name = "openrouter"

    FREE_MODELS = [
        "openrouter/free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "nvidia/nemotron-3.5-lightning:free",
        "cohere/north-mini-code:free",
        "liquid/lfm-2.5-2.6b:free",
    ]

    def __init__(self, api_key: str, model: str = "openrouter/free", timeout_seconds: float = 35.0):
        self.api_key = api_key.strip()
        self.model_name = model or "openrouter/free"
        self.timeout_seconds = timeout_seconds

    def generate_json(self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]) -> str:
        if not self.api_key:
            raise LLMNotConfiguredError("No OpenRouter API key configured. Set OPENROUTER_API_KEY.")

        augmented_system = (
            system_prompt +
            "\n\nIMPORTANT: You must return valid JSON conforming to this schema:\n" +
            json.dumps(response_model.model_json_schema())
        )

        seen = set()
        models = []
        for m in [self.model_name] + self.FREE_MODELS:
            if m and m not in seen:
                seen.add(m)
                models.append(m)

        last_error = None
        for model in models:
            try:
                logger.info("Attempting OpenRouter request using model: %s", model)
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": augmented_system},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.0
                }
                r = httpx.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://radix-platform.local",
                        "X-Title": "RADIX JD Analytics"
                    },
                    json=payload,
                    timeout=self.timeout_seconds
                )
                if r.status_code == 200:
                    data = r.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        raw_content = choices[0]["message"]["content"]
                        logger.info("OpenRouter (%s) extraction succeeded", model)
                        return normalize_extraction_json(raw_content)
                elif r.status_code == 429:
                    logger.warning("OpenRouter model %s hit rate limit (429)", model)
                    last_error = LLMRateLimitError(f"OpenRouter model {model} rate limited")
                elif r.status_code in (401, 403):
                    logger.warning("OpenRouter rejected API key (status %d)", r.status_code)
                    raise LLMAuthError("OpenRouter API key rejected")
                else:
                    logger.warning("OpenRouter model %s status %d: %s", model, r.status_code, r.text[:120])
                    last_error = LLMUnavailableError(f"OpenRouter returned status {r.status_code}")
            except LLMAuthError:
                raise
            except Exception as e:
                logger.warning("OpenRouter model %s error: %s", model, e)
                last_error = LLMUnavailableError(f"OpenRouter error: {e}")

        raise last_error or LLMUnavailableError("All OpenRouter models failed.")


class FallbackLLMClient:
    def __init__(self, clients: list[LLMClient]):
        self.clients = [c for c in clients if c]
        self.provider_name = "->".join(c.provider_name for c in self.clients)
        self.model_name = " | ".join(f"{c.provider_name}:{c.model_name}" for c in self.clients)

    def generate_json(self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]) -> str:
        last_exc = None
        for i, client in enumerate(self.clients):
            try:
                return client.generate_json(system_prompt, user_prompt, response_model)
            except Exception as exc:
                last_exc = exc
                if i < len(self.clients) - 1:
                    next_client = self.clients[i + 1]
                    logger.warning(
                        "LLM provider '%s' failed (%s: %s). Falling back to '%s' (%s)...",
                        client.provider_name, type(exc).__name__, exc, next_client.provider_name, next_client.model_name
                    )
                else:
                    logger.error("Final fallback LLM provider '%s' failed: %s", client.provider_name, exc)
        raise last_exc or LLMUnavailableError("All configured LLM providers failed.")


def build_llm_client(settings: Settings) -> LLMClient:
    clients: list[LLMClient] = []

    # 1. Primary provider
    if settings.llm_provider == "gemini":
        gemini_key = settings.gemini_api_key.get_secret_value()
        if not gemini_key:
            raise LLMNotConfiguredError("GEMINI_API_KEY is not set. Add it to your .env file.")
        clients.append(GeminiClient(gemini_key, settings.gemini_model, settings.llm_timeout_seconds))
    elif settings.llm_provider == "groq":
        groq_keys = settings.groq_api_keys
        if not groq_keys:
            raise LLMNotConfiguredError("GROQ_API_KEY is not set. Add it to your .env file.")
        clients.append(GroqClient(groq_keys, settings.groq_model, settings.llm_timeout_seconds))
    elif settings.llm_provider == "openrouter":
        openrouter_key = settings.openrouter_key
        if not openrouter_key:
            raise LLMNotConfiguredError("OPENROUTER_API_KEY is not set. Add it to your .env file.")
        clients.append(OpenRouterClient(openrouter_key, settings.openrouter_model, settings.llm_timeout_seconds))

    # 2. Add fallback providers if not already added
    if settings.fallback_to_groq:
        groq_keys = settings.groq_api_keys
        if groq_keys and not any(c.provider_name == "groq" for c in clients):
            clients.append(GroqClient(groq_keys, settings.groq_model, settings.llm_timeout_seconds))

    if settings.fallback_to_openrouter:
        openrouter_key = settings.openrouter_key
        if openrouter_key and not any(c.provider_name == "openrouter" for c in clients):
            clients.append(OpenRouterClient(openrouter_key, settings.openrouter_model, settings.llm_timeout_seconds))

    if not clients:
        raise LLMNotConfiguredError(
            "No LLM provider keys configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in .env."
        )

    if len(clients) == 1:
        return clients[0]

    return FallbackLLMClient(clients)

