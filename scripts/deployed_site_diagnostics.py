#!/usr/bin/env python3
"""Diagnose connectivity, CORS, authentication, dashboard routes, and optional AI generation."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from urllib import error, parse, request


@dataclass
class Check:
    name: str
    ok: bool
    detail: str


def normalized_base(value: str) -> str:
    value = value.strip().rstrip("/")
    parsed = parse.urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise argparse.ArgumentTypeError("URL must start with http:// or https://")
    return value


def http_request(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: dict | None = None,
    timeout: int = 20,
) -> tuple[int | None, dict[str, str], bytes, str | None]:
    request_headers = {"Accept": "application/json", **(headers or {})}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")
    req = request.Request(url, data=data, headers=request_headers, method=method)
    try:
        with request.urlopen(req, timeout=timeout) as response:
            return response.status, dict(response.headers.items()), response.read(), None
    except error.HTTPError as exc:
        return exc.code, dict(exc.headers.items()), exc.read(), None
    except (error.URLError, TimeoutError, OSError) as exc:
        return None, {}, b"", str(exc.reason if isinstance(exc, error.URLError) else exc)


def parse_json(raw: bytes) -> dict | list | None:
    try:
        result = json.loads(raw.decode("utf-8"))
        return result if isinstance(result, (dict, list)) else None
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def describe_response(status: int | None, body: bytes, network_error: str | None) -> str:
    if network_error:
        return f"connection failed: {network_error}"
    payload = parse_json(body)
    if isinstance(payload, dict):
        message = payload.get("message") or payload.get("error") or payload.get("status")
        if message:
            return f"HTTP {status}: {str(message)[:240]}"
    return f"HTTP {status}"


def add_check(checks: list[Check], name: str, ok: bool, detail: str) -> None:
    checks.append(Check(name, ok, detail))
    marker = "PASS" if ok else "FAIL"
    print(f"[{marker}] {name}: {detail}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check a deployed TokenMeter site without printing credentials or API keys."
    )
    parser.add_argument(
        "--gateway",
        default=os.getenv("TOKENMETER_GATEWAY_URL", "https://tokenmeter-gateway.onrender.com"),
        type=normalized_base,
        help="Gateway base URL (default: TOKENMETER_GATEWAY_URL or current Render gateway)",
    )
    parser.add_argument(
        "--frontend-origin",
        default=os.getenv("TOKENMETER_FRONTEND_ORIGIN"),
        help="Frontend origin to test CORS against, e.g. https://tokenmeter-frontend.onrender.com",
    )
    parser.add_argument("--project", default=os.getenv("TOKENMETER_PROJECT_URL"), type=normalized_base)
    parser.add_argument("--quota", default=os.getenv("TOKENMETER_QUOTA_URL"), type=normalized_base)
    parser.add_argument("--ai", default=os.getenv("TOKENMETER_AI_URL"), type=normalized_base)
    parser.add_argument("--ingestion", default=os.getenv("TOKENMETER_INGESTION_URL"), type=normalized_base)
    parser.add_argument("--username", default=os.getenv("TOKENMETER_USERNAME"))
    parser.add_argument("--password", default=os.getenv("TOKENMETER_PASSWORD"))
    parser.add_argument("--tenant-id", default=os.getenv("TOKENMETER_TENANT_ID"))
    parser.add_argument(
        "--run-ai",
        action="store_true",
        help="Send one real AI generation request; this may use provider quota and create metered usage.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=20,
        help="Per-request timeout in seconds (default: 20)",
    )
    args = parser.parse_args()

    checks: list[Check] = []
    gateway = args.gateway
    print(f"Gateway: {gateway}")

    status, _, body, network_error = http_request(
        f"{gateway}/actuator/health", timeout=args.timeout
    )
    payload = parse_json(body)
    healthy = status == 200 and isinstance(payload, dict) and payload.get("status") == "UP"
    add_check(checks, "gateway health", healthy, describe_response(status, body, network_error))

    if args.frontend_origin:
        origin = args.frontend_origin.strip().rstrip("/")
        status, headers, body, network_error = http_request(
            f"{gateway}/auth/login",
            method="OPTIONS",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=args.timeout,
        )
        allowed_origin = next(
            (value for key, value in headers.items() if key.lower() == "access-control-allow-origin"),
            None,
        )
        cors_ok = status is not None and status < 400 and allowed_origin == origin
        add_check(
            checks,
            "CORS preflight",
            cors_ok,
            f"{describe_response(status, body, network_error)}; allow-origin={allowed_origin or 'missing'}",
        )

    status, _, body, network_error = http_request(
        f"{gateway}/auth/login",
        method="POST",
        body={
            "username": "__tokenmeter_deployment_probe_nonexistent__",
            "password": "__invalid_probe_password__",
        },
        timeout=args.timeout,
    )
    login_route_ok = status == 401
    add_check(
        checks,
        "gateway auth routing",
        login_route_ok,
        "HTTP 401 for intentionally invalid probe credentials; project auth route is reachable"
        if login_route_ok
        else describe_response(status, body, network_error),
    )

    probe_tenant = "__tokenmeter_deployment_probe__"
    status, _, body, network_error = http_request(
        f"{gateway}/api/v1/tenants/{probe_tenant}/quota",
        timeout=args.timeout,
    )
    quota_route_ok = status == 401
    add_check(
        checks,
        "gateway quota routing",
        quota_route_ok,
        "HTTP 401 without credentials; quota route is reachable"
        if quota_route_ok
        else describe_response(status, body, network_error),
    )

    status, _, body, network_error = http_request(
        f"{gateway}/api/v1/ai/generate",
        method="POST",
        body={"prompt": "diagnostic route probe"},
        timeout=args.timeout,
    )
    ai_route_ok = status == 401
    add_check(
        checks,
        "gateway AI routing",
        ai_route_ok,
        "HTTP 401 without an API key; AI route is reachable"
        if ai_route_ok
        else describe_response(status, body, network_error),
    )

    for name, base in (
        ("project", args.project),
        ("quota", args.quota),
        ("AI", args.ai),
    ):
        if not base:
            continue
        status, _, body, network_error = http_request(
            f"{base}/actuator/health", timeout=args.timeout
        )
        payload = parse_json(body)
        healthy = status == 200 and isinstance(payload, dict) and payload.get("status") == "UP"
        add_check(checks, f"{name} direct health", healthy, describe_response(status, body, network_error))

    if args.username or args.password:
        if not args.username or not args.password:
            add_check(checks, "login credentials", False, "provide both username and password")
        else:
            status, _, body, network_error = http_request(
                f"{gateway}/auth/login",
                method="POST",
                body={"username": args.username, "password": args.password},
                timeout=args.timeout,
            )
            response = parse_json(body)
            access_token = response.get("accessToken") if isinstance(response, dict) else None
            login_ok = status == 200 and bool(access_token)
            add_check(
                checks,
                "login through gateway",
                login_ok,
                "HTTP 200; access token received (value hidden)"
                if login_ok
                else describe_response(status, body, network_error),
            )

            if login_ok:
                if not args.tenant_id:
                    add_check(
                        checks,
                        "dashboard API checks",
                        False,
                        "login succeeded; pass --tenant-id (or TOKENMETER_TENANT_ID) to test usage, quota, and invoices",
                    )
                else:
                    auth_headers = {"Authorization": f"Bearer {access_token}"}
                    for label, path in (
                        ("usage", f"/api/v1/tenants/{parse.quote(args.tenant_id, safe='')}/usage"),
                        ("quota", f"/api/v1/tenants/{parse.quote(args.tenant_id, safe='')}/quota"),
                        ("invoices", f"/api/v1/tenants/{parse.quote(args.tenant_id, safe='')}/invoice"),
                    ):
                        status, _, body, network_error = http_request(
                            f"{gateway}{path}",
                            headers=auth_headers,
                            timeout=args.timeout,
                        )
                        add_check(
                            checks,
                            f"dashboard {label} API",
                            status is not None and 200 <= status < 300,
                            describe_response(status, body, network_error),
                        )

    api_key = os.getenv("TOKENMETER_API_KEY")
    if args.run_ai:
        if not api_key:
            add_check(
                checks,
                "AI generation",
                False,
                "set TOKENMETER_API_KEY; key value is read from environment and never printed",
            )
        else:
            status, _, body, network_error = http_request(
                f"{gateway}/api/v1/ai/generate",
                method="POST",
                headers={"X-API-KEY": api_key},
                body={"prompt": "Reply with the single word OK."},
                timeout=args.timeout,
            )
            response = parse_json(body)
            ai_ok = status == 200 and isinstance(response, dict)
            details = describe_response(status, body, network_error)
            if ai_ok:
                details = (
                    f"HTTP 200; provider response received; totalTokens="
                    f"{response.get('totalTokens', 'not reported')} (generated text hidden)"
                )
            add_check(checks, "AI generation (billable)", ai_ok, details)
    elif api_key:
        print("[SKIP] AI generation: TOKENMETER_API_KEY is set but --run-ai was not supplied.")

    passed = sum(check.ok for check in checks)
    failed = len(checks) - passed
    print(f"\nResult: {passed} passed, {failed} failed, {len(checks)} checks.")
    if not checks:
        print("No checks ran.")
        return 2
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
