from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from .._http import post_json
from ..models import GenerateResponse, GenerateOptions, GenerateUsage


class AIClient:
    """Client for the platform's metered AI product.

    Wraps exactly one endpoint:

        POST {base}/api/v1/ai/generate      (X-API-KEY + X-API-KEY-ENV)

    Every successful call is recorded and charged to the API key's tenant.

    Parameters
    ----------
    api_key:
        The tenant's secret key (``sec_live_...`` or the seeded ``key_456``).
    base_url:
        AI-service URL, e.g. ``http://localhost:8083``.
    timeout:
        Per-request timeout in seconds.
    http:
        Optional shared ``httpx.Client``. When omitted one is created
        (and closed with the client) so callers can stay fully stateless.
    """

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        timeout: float,
        api_key_env: str = "sec_live",
        http: Optional[httpx.Client] = None,
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("api_key must be a non-empty string")
        self._api_key = api_key
        self._api_key_env = api_key_env
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._owns_http = http is None
        self._http = http or httpx.Client(timeout=timeout)

    # -- the one metered operation ----------------------------------------
    def generate(
        self,
        prompt: str,
        *,
        model: Optional[str] = None,
    ) -> GenerateResponse:
        """Run one metered generation.

        Args:
            prompt: The text to send to the model.
            model:  Optional model override (platform default applies otherwise).

        Returns:
            Typed :class:`GenerateResponse` with the generated text and the
            token usage metered to the API key's tenant.
        """
        if not prompt or not prompt.strip():
            raise ValueError("prompt must be a non-empty string")

        payload: Dict[str, Any] = {"prompt": prompt.strip()}
        if model:
            payload["model"] = model

        data = post_json(
            self._http,
            f"{self._base_url}/api/v1/ai/generate",
            api_key=self._api_key,
            api_key_env=self._api_key_env,
            timeout=self._timeout,
            payload=payload,
        )
        return GenerateResponse.from_dict(data)

    # -- lifecycle --------------------------------------------------------
    def close(self) -> None:
        if self._owns_http:
            self._http.close()

    def __enter__(self) -> "AIClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

