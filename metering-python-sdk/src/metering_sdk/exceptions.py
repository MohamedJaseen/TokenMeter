from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

__all__ = [
    "MeteringError",
    "AuthenticationError",
    "ValidationError",
    "QuotaExceededError",
    "RateLimitError",
    "NotFoundError",
    "TimeoutError",
    "ConnectionError",
    "error_for_status",
]


class MeteringError(Exception):
    """Base class for every error raised by the metering SDK."""

    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        payload: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload


class AuthenticationError(MeteringError):
    """API key is missing, invalid, revoked, or lacks permission (401/403)."""


class ValidationError(MeteringError):
    """The request failed server-side validation (400/422)."""


class QuotaExceededError(MeteringError):
    """The tenant ran out of metered quota for this operation (402/400)."""


class RateLimitError(MeteringError):
    """The platform throttled the request (429 - too many requests)."""


class NotFoundError(MeteringError):
    """The requested resource does not exist (404)."""


class TimeoutError(MeteringError):
    """The request timed out before the platform responded (408)."""


class ConnectionError(MeteringError):
    """Could not reach the platform (network refused/reset)."""


# -- compatibility aliases (httpx/metering_client raise the SDK-prefixed
#    names; keep both spellings importable so internal code stays terse) ----
SDKTimeoutError = TimeoutError
SDKConnectionError = ConnectionError


def error_for_status(
    status_code: int,
    message: str,
    *,
    payload: Any = None,
) -> MeteringError:
    """Build the right typed error for a non-2xx HTTP status."""
    if status_code in (401, 403):
        return AuthenticationError(message, status_code=status_code, payload=payload)
    if status_code == 404:
        return NotFoundError(message, status_code=status_code, payload=payload)
    if status_code in (400, 422):
        return ValidationError(message, status_code=status_code, payload=payload)
    if status_code in (402, 429):
        # 402 = exhausted quota; 429 = throttled
        cls = QuotaExceededError if status_code == 402 else RateLimitError
        return cls(message, status_code=status_code, payload=payload)
    return MeteringError(message, status_code=status_code, payload=payload)
