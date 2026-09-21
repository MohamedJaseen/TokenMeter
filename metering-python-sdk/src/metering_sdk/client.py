from typing import Any, Dict, Optional

from ._http import post_json
from .models import GenerateResponse, GenerateOptions, GenerateUsage
from .ai.client import AIClient


class MeteringClient:
    """Root client for the Metering & Billing platform.

    Composes sub-clients per product area (``ai`` today, more later).
    All requests share the caller's API key.
    """

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "http://localhost:8083",
        timeout: float = 60.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("api_key must be a non-empty string")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self.ai = AIClient(
            api_key=api_key,
            base_url=self._base_url,
            timeout=timeout,
        )

    # -- lifecycle --------------------------------------------------------
    def close(self) -> None:
        self.ai.close()

    def __enter__(self) -> "MeteringClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
