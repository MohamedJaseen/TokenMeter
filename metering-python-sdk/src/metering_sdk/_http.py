from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from .exceptions import MeteringError, error_for_status


def post_json(
    http: httpx.Client,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    api_key: Optional[str] = None,
    api_key_env: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    timeout: float = 60.0,
) -> Dict[str, Any]:
    """POST JSON to the platform and turn failures into typed SDK errors.

    ``url`` is fully qualified (base URL + path). Returns the decoded JSON
    object on 2xx; raises the matching :class:`MeteringError` subclass
    otherwise. Timeout / transport failures are wrapped too.
    """
    merged = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        merged.update(headers)
    if api_key:
        merged["X-API-KEY"] = api_key
    if api_key_env:
        merged["X-API-KEY-ENV"] = api_key_env

    try:
        response = http.post(
            url,
            headers=merged,
            json=payload if payload is not None else {},
            timeout=timeout,
        )
    except httpx.TimeoutException as exc:
        from .exceptions import SDKTimeoutError

        raise SDKTimeoutError(
            "Request timed out", status_code=408
        ) from exc
    except httpx.TransportError as exc:
        from .exceptions import SDKConnectionError

        raise SDKConnectionError(
            "Could not reach the platform", status_code=None
        ) from exc

    if 200 <= response.status_code < 300:
        if not response.content:
            return {}
        try:
            body = response.json()
        except ValueError:
            return {"text": response.text}
        return body if isinstance(body, dict) else {"text": response.text}

    body: Any = None
    try:
        body = response.json() if response.content else None
    except ValueError:
        body = response.text
    message = _extract_message(body, response.status_code)
    raise error_for_status(response.status_code, message, payload=body)


def get_json(
    http: httpx.Client,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    api_key: Optional[str] = None,
    api_key_env: Optional[str] = None,
    timeout: float = 60.0,
) -> Dict[str, Any]:
    """GET a fully-qualified ``url`` and decode JSON; typed errors otherwise."""
    merged = {"Accept": "application/json"}
    if headers:
        merged.update(headers)
    if api_key:
        merged["X-API-KEY"] = api_key
    if api_key_env:
        merged["X-API-KEY-ENV"] = api_key_env

    try:
        response = http.get(url, headers=merged, timeout=timeout)
    except httpx.TimeoutException as exc:
        from .exceptions import SDKTimeoutError

        raise SDKTimeoutError("Request timed out", status_code=408) from exc
    except httpx.TransportError as exc:
        from .exceptions import SDKConnectionError

        raise SDKConnectionError("Could not reach the platform", status_code=None) from exc

    if 200 <= response.status_code < 300:
        if not response.content:
            return {}
        try:
            body = response.json()
        except ValueError:
            return {"text": response.text}
        return body if isinstance(body, dict) else {"text": response.text}

    body: Any = None
    try:
        body = response.json() if response.content else None
    except ValueError:
        body = response.text
    message = _extract_message(body, response.status_code)
    raise error_for_status(response.status_code, message, payload=body)


def _extract_message(body: Any, status_code: int) -> str:
    if isinstance(body, dict):
        for key in ("message", "error", "detail"):
            value = body.get(key)
            if value:
                return str(value)
    elif isinstance(body, str) and body:
        return body
    return "Request failed with status %s" % status_code
