from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Optional


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


@dataclass
class GenerateOptions:
    """Optional per-call knobs for ``ai.generate`` (sparse serialisation)."""

    model: Optional[str] = None
    tenant_id: Optional[str] = None

    def to_dict(self) -> dict:
        out: dict = {}
        if self.model:
            out["model"] = self.model
        if self.tenant_id:
            out["tenantId"] = self.tenant_id
        return out


@dataclass
class GenerateUsage:
    """Token counters the platform reports after a ``generate`` call."""

    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

    @classmethod
    def from_dict(cls, data: Any) -> "GenerateUsage":
        if not isinstance(data, dict):
            data = {}
        return cls(
            input_tokens=_as_int(data.get("inputTokens")),
            output_tokens=_as_int(data.get("outputTokens")),
            total_tokens=_as_int(data.get("totalTokens")),
        )

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class GenerateResponse:
    """Typed result of one metered AI ``generate`` call."""

    response_id: str = ""
    model: str = ""
    tenant_id: str = ""
    text: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

    @property
    def usage(self) -> GenerateUsage:
        """Token usage metered to this API key's tenant, as a typed object."""
        return GenerateUsage(
            input_tokens=self.input_tokens,
            output_tokens=self.output_tokens,
            total_tokens=self.total_tokens,
        )

    @classmethod
    def from_dict(cls, data: Any) -> "GenerateResponse":
        if not isinstance(data, dict):
            data = {}
        return cls(
            response_id=str(data.get("responseId") or ""),
            model=str(data.get("model") or ""),
            tenant_id=str(data.get("tenantId") or ""),
            text=str(data.get("text") or ""),
            input_tokens=_as_int(data.get("inputTokens")),
            output_tokens=_as_int(data.get("outputTokens")),
            total_tokens=_as_int(data.get("totalTokens")),
        )

    def to_dict(self) -> dict:
        return asdict(self)


__all__ = ["GenerateOptions", "GenerateUsage", "GenerateResponse"]
