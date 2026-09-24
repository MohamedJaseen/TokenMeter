#!/usr/bin/env python3
"""Project validation for TokenMeter.

This suite works as a strong integration/smoke harness and also includes the most
important architecture-specific checks for idempotency, quota, billing, and
Redis/PostgreSQL flow verification.

It intentionally reports rich diagnostic output so failures are actionable.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

ROOT = Path(__file__).resolve().parent.parent
GATEWAY_BASE = "http://localhost:8090"
DEMO_BASE = "http://localhost:8080"
PROJECT_BASE = "http://localhost:8081"
QUOTA_BASE = "http://localhost:8082"
AI_BASE = "http://localhost:8083"
FRONTEND_BASE = "http://localhost:5173"


def load_local_env():
    values = {}
    env_file = ROOT / ".env"
    if not env_file.exists():
        return values
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


LOCAL_ENV = load_local_env()


def bearer_headers(token):
    return {"Authorization": f"Bearer {token}"} if token else {}


def internal_headers():
    token = LOCAL_ENV.get("INTERNAL_SERVICE_TOKEN") or os.environ.get("INTERNAL_SERVICE_TOKEN")
    return {"X-Internal-Token": token} if token else {}


def current_event_timestamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class ScenarioResult:
    def __init__(self, area: str, test: str):
        self.area = area
        self.test = test
        self.ok = False
        self.expected = None
        self.actual = None
        self.likely_area = None
        self.checks: list[str] = []
        self.details: list[str] = []

    def mark_pass(self, *details: str):
        self.ok = True
        self.details.extend(details)

    def mark_fail(self, expected, actual, likely_area: str, checks: list[str], *details: str):
        self.ok = False
        self.expected = expected
        self.actual = actual
        self.likely_area = likely_area
        self.checks.extend(checks)
        self.details.extend(details)

    def print_report(self):
        if self.ok:
            print(f"[PASS] {self.area} :: {self.test}")
            for d in self.details:
                print(f"    - {d}")
            return

        print("============================================================")
        print("FAILURE")
        print("============================================================")
        print(f"AREA       : {self.area}")
        print(f"TEST       : {self.test}")
        print(f"EXPECTED   : {self.expected}")
        print(f"ACTUAL     : {self.actual}")
        print(f"LIKELY AREA:")
        print(f"  {self.likely_area}")
        print("CHECK:")
        for idx, check in enumerate(self.checks, start=1):
            print(f"  {idx}. {check}")
        if self.details:
            print("DETAIL:")
            for d in self.details:
                print(f"  - {d}")
        print("============================================================")


def run_cmd(name: str, cmd: list[str], cwd: Path | None = None, timeout: int = 600) -> tuple[bool, str, str]:
    print(f"\n=== {name} ===")
    executable = shutil.which(cmd[0])
    if executable is None and sys.platform == "win32":
        candidates = [
            Path.home() / "tools" / "apache-maven-3.9.11" / "bin" / "mvn.cmd",
            Path.home() / "tools" / "apache-maven-3.9.11" / "bin" / "mvn.bat",
        ]
        for candidate in candidates:
            if candidate.exists():
                executable = str(candidate)
                break
    resolved_cmd = [executable or cmd[0], *cmd[1:]]
    print("$", " ".join(resolved_cmd))
    try:
        proc = subprocess.run(
            resolved_cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        message = f"command not found: {cmd[0]} ({exc})"
        print(message, file=sys.stderr)
        return False, "", message
    stdout = proc.stdout.strip()
    stderr = proc.stderr.strip()
    if stdout:
        print(stdout[:5000])
    if stderr:
        print(stderr[:5000], file=sys.stderr)
    print(f"-> exit={proc.returncode}")
    return proc.returncode == 0, stdout, stderr


def http_json(method: str, url: str, data=None, headers=None, timeout: int = 30):
    payload = None
    final_headers = {"Content-Type": "application/json"}
    if headers:
        final_headers.update(headers)
    if data is not None:
        payload = json.dumps(data).encode("utf-8")
    request = urllib_request.Request(url, data=payload, headers=final_headers, method=method)
    try:
        with urllib_request.urlopen(request, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            if not body:
                return resp.status, {}
            try:
                return resp.status, json.loads(body)
            except Exception:
                return resp.status, body
    except urllib_error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(body)
        except Exception:
            return exc.code, body
    except Exception as exc:
        return None, {"error": str(exc)}


def wait_for_service(name: str, url: str, timeout_seconds: int = 180) -> bool:
    deadline = time.monotonic() + timeout_seconds
    last_error = ""
    while time.monotonic() < deadline:
        try:
            status, _ = http_json("GET", url, timeout=5)
            if status == 200:
                print(f"[OK] {name} is reachable at {url}")
                return True
            last_error = f"status={status}"
        except Exception as exc:
            last_error = str(exc)
        time.sleep(3)
    print(f"[FAIL] {name} did not become reachable at {url}: {last_error}")
    return False


def docker_exec_sql(query: str) -> tuple[int, str]:
    cmd = ["docker", "exec", "metering-postgres", "psql", "-U", "postgres", "-d", "Billing", "-t", "-A", "-c", query]
    ok, out, err = run_cmd("docker exec psql query", cmd, cwd=ROOT, timeout=60)
    if not ok:
        return 1, err or out
    return 0, out.strip()


def read_usage_total(tenant_id: str, metric_name: str, minutes_back: int = 120) -> int | None:
    query = (
        f"SELECT COALESCE(SUM(total_units), 0)::bigint "
        f"FROM usage_hourly_aggregates "
        f"WHERE tenant_id = '{tenant_id}' "
        f"AND metric_name = '{metric_name}' "
        f"AND bucket_hour >= NOW() - INTERVAL '{minutes_back} minutes';"
    )
    code, output = docker_exec_sql(query)
    if code != 0:
        return None
    try:
        return int(str(output).strip())
    except (TypeError, ValueError):
        return None


def wait_for_usage_total(tenant_id: str, metric_name: str, expected_total: int, timeout_seconds: int = 30, minutes_back: int = 120) -> int | None:
    deadline = time.monotonic() + timeout_seconds
    last_total = None
    while time.monotonic() < deadline:
        total = read_usage_total(tenant_id, metric_name, minutes_back=minutes_back)
        last_total = total
        if total is not None and total >= expected_total:
            return total
        time.sleep(2)
    return last_total


def ensure_stack_started(skip_docker: bool):
    results = []
    if skip_docker:
        print("[SKIP] Docker stack startup skipped by command flag")
        return results

    result = ScenarioResult("INFRASTRUCTURE", "Docker compose startup")
    ok, _, _ = run_cmd("docker compose up -d --wait", ["docker", "compose", "up", "-d", "--wait"], cwd=ROOT, timeout=600)
    if ok:
        result.mark_pass("Docker stack is up and healthy")
    else:
        result.mark_fail("docker compose up -d --wait succeeds", "command failed", "Docker / Compose", ["docker compose status", "container healthchecks", "service logs"], "docker compose up -d --wait failed")
    results.append(result)
    return results


def run_java_tests():
    results = []
    module_paths = [ROOT / "demo", ROOT / "project", ROOT / "quota", ROOT / "ai-service"]
    for module in module_paths:
        result = ScenarioResult("BACKEND", f"mvn test :: {module.name}")
        ok, _, _ = run_cmd("mvn test", ["mvn", "test"], cwd=module, timeout=600)
        if ok:
            result.mark_pass("Java test suite passed")
        else:
            result.mark_fail("all Java module tests pass", f"mvn test failed in {module.name}", "Maven / Spring boot test setup", ["check build config", "run module tests alone", "review failing test logs"], "Java test execution failed")
        results.append(result)
    return results


def run_python_sdk_tests():
    results = []
    sdk_dir = ROOT / "metering-python-sdk"
    result = ScenarioResult("SDK", "pytest")
    if not sdk_dir.exists():
        result.mark_fail("SDK tests pass", "sdk directory missing", "Python SDK project layout", ["verify SDK is present", "check project root layout"], f"SDK path not found: {sdk_dir}")
        results.append(result)
        return results

    ok, _, _ = run_cmd("pytest", [sys.executable, "-m", "pytest", "-q"], cwd=sdk_dir, timeout=300)
    if ok:
        result.mark_pass("Python SDK tests passed")
    else:
        result.mark_fail("SDK tests pass", "pytest failed", "Python SDK / test suite", ["check sdk dependencies", "run failing tests individually"], "Python SDK suite failed")
    results.append(result)
    return results


def run_frontend_build():
    results = []
    result = ScenarioResult("FRONTEND", "npm run build")
    frontend_dir = ROOT / "frontend"
    if not frontend_dir.exists():
        result.mark_fail("frontend build succeeds", "frontend folder missing", "frontend project path", ["verify frontend path"], f"Folder not found: {frontend_dir}")
        results.append(result)
        return results

    ok, _, _ = run_cmd("npm run build", ["npm", "run", "build"], cwd=frontend_dir, timeout=300)
    if ok:
        result.mark_pass("Frontend production build succeeded")
    else:
        result.mark_fail("frontend build succeeds", "npm run build failed", "frontend app build", ["check react build config", "review build logs"], "Frontend build failed")
    results.append(result)
    return results


def check_service_healths():
    results = []
    checks = [
        ("gateway health", GATEWAY_BASE + "/actuator/health"),
        ("demo health", DEMO_BASE + "/actuator/health"),
        ("project health", PROJECT_BASE + "/actuator/health"),
        ("quota health", QUOTA_BASE + "/actuator/health"),
        ("ai service health", AI_BASE + "/actuator/health"),
    ]
    for label, url in checks:
        result = ScenarioResult("INFRASTRUCTURE", label)
        ok = wait_for_service(label, url, timeout_seconds=120)
        if ok:
            result.mark_pass(f"{url} returned HTTP 200")
        else:
            result.mark_fail("HTTP 200 health check", f"service not reachable at {url}", "service startup / healthcheck", ["check container logs", "confirm port binding", "verify app bootstrap"], f"{label} failed health check")
        results.append(result)
    return results


def extract_tenant_ids(tenants):
    ids = []
    if not isinstance(tenants, list):
        return ids
    for record in tenants:
        if not isinstance(record, dict):
            continue
        tenant_id = record.get("id") or record.get("tenantId") or record.get("tenant_id")
        if tenant_id and tenant_id not in ids:
            ids.append(tenant_id)
    return ids


def admin_login_and_tenants():
    results = []

    login_result = ScenarioResult("AUTH", "admin login")
    status, body = http_json("POST", GATEWAY_BASE + "/auth/login", {"username": "admin", "password": "devPass1234"}, timeout=30)
    token = body.get("accessToken") if isinstance(body, dict) else None
    if status == 200 and token:
        login_result.mark_pass("JWT access token received")
    else:
        login_result.mark_fail("200 OK + JWT", f"status={status}; body={body}", "gateway auth / JWT config", ["verify login credentials", "check gateway auth route", "review spring security config"], "admin login failed")
    results.append(login_result)

    tenant_result = ScenarioResult("AUTH", "tenant listing")
    tenant_status, tenant_body = http_json("GET", GATEWAY_BASE + "/api/v1/admin/tenants", headers={"Authorization": f"Bearer {token}"} if token else {}, timeout=30)
    tenants = tenant_body if isinstance(tenant_body, list) else tenant_body.get("tenants", []) if isinstance(tenant_body, dict) else []
    tenant_ids = extract_tenant_ids(tenants)
    if tenant_status == 200 and len(tenant_ids) > 0:
        tenant_result.mark_pass(f"retrieved {len(tenant_ids)} tenant records")
    else:
        tenant_result.mark_fail("tenant list returned", f"status={tenant_status}; body={tenant_body}", "gateway admin route / tenant service", ["check auth headers", "verify tenant repository", "inspect admin controller"], "tenant listing failed")
    results.append(tenant_result)

    api_key_result = ScenarioResult("AUTH", "API key lookup")
    api_key = None
    chosen_tenant_id = tenant_ids[0] if tenant_ids else None
    if isinstance(tenants, list):
        for record in tenants:
            if isinstance(record, dict):
                api_key = record.get("apiKey") or record.get("key")
                if not api_key and chosen_tenant_id:
                    create_status, create_body = http_json(
                        "POST",
                        f"{GATEWAY_BASE}/api/v1/tenants/{chosen_tenant_id}/api-keys",
                        {"label": "project-test-suite"},
                        headers=bearer_headers(token),
                        timeout=30,
                    )
                    if create_status in (200, 201) and isinstance(create_body, dict):
                        api_key = create_body.get("secret") or create_body.get("key") or create_body.get("apiKey")

                if api_key:
                    break
        if not api_key and chosen_tenant_id:
            api_status, api_body = http_json("GET", f"{GATEWAY_BASE}/api/v1/admin/tenants/{chosen_tenant_id}/api-keys", headers={"Authorization": f"Bearer {token}"} if token else {}, timeout=30)
            api_keys = api_body if isinstance(api_body, list) else api_body.get("apiKeys", []) if isinstance(api_body, dict) else []
            if api_keys and isinstance(api_keys[0], dict):
                api_key = api_keys[0].get("key") or api_keys[0].get("apiKey")
            if not api_key:
                create_status, create_body = http_json(
                    "POST",
                    f"{GATEWAY_BASE}/api/v1/tenants/{chosen_tenant_id}/api-keys",
                    {"label": "project-test-suite"},
                    headers=bearer_headers(token),
                    timeout=30,
                )
                if create_status in (200, 201) and isinstance(create_body, dict):
                    api_key = create_body.get("secret") or create_body.get("key") or create_body.get("apiKey")

    if api_key:
        api_key_result.mark_pass(f"API key discovered: {api_key[:8]}...")
    else:
        api_key_result.mark_fail("API key available", "not found from admin tenant lookup", "tenant / API key resolution", ["verify tenant seeding", "check api-key endpoints", "validate admin auth scope"], "API key lookup failed")
    results.append(api_key_result)

    return results, token, api_key, tenant_ids


def ai_generate_and_usage(api_key, tenant_ids=None):
    results = []
    result = ScenarioResult("AI_METERING", "AI generate + database token verification")
    if not api_key:
        result.mark_fail("API key present", "no API key available", "tenant/API key resolution", ["resolve tenant key", "verify AI auth config"], "AI generation skipped because API key lookup failed")
        results.append(result)
        return results

    tenant_id = tenant_ids[0] if isinstance(tenant_ids, list) and len(tenant_ids) > 0 else None
    baseline_total = read_usage_total(tenant_id, "llm_tokens") if tenant_id else None
    if baseline_total is None:
        baseline_total = 0

    status, body = http_json("POST", GATEWAY_BASE + "/api/v1/ai/generate", {"prompt": "Explain Redis in one sentence"}, headers={"X-API-KEY": api_key}, timeout=40)
    response_text = body.get("text") if isinstance(body, dict) else ""
    total_tokens = body.get("totalTokens") if isinstance(body, dict) else None
    tenant_from_response = body.get("tenantId") if isinstance(body, dict) else None
    ai_tenant_id = tenant_id or tenant_from_response

    if status == 200 and response_text:
        result.details.append("AI generation returned a response")
    else:
        result.mark_fail("HTTP 200 + text response", f"status={status}; body={body}", "AI gateway / model integration", ["check API key header", "verify AI service health", "inspect model response handling"], "AI generation failed")
        results.append(result)
        return results

    if ai_tenant_id and total_tokens:
        result.details.append(f"response totalTokens={total_tokens} for tenant={ai_tenant_id}")
    else:
        result.details.append("AI response had no usable totalTokens metadata")

    if ai_tenant_id:
        final_total = wait_for_usage_total(ai_tenant_id, "llm_tokens", baseline_total + int(total_tokens or 0), timeout_seconds=30)
        delta_total = (final_total if final_total is not None else 0) - baseline_total
        if final_total is not None and delta_total == int(total_tokens or 0):
            result.mark_pass(f"AI token delta matched PostgreSQL: delta={delta_total}, response totalTokens={total_tokens}")
        else:
            result.mark_fail("database delta == response totalTokens", f"tenant={ai_tenant_id}; baseline={baseline_total}; final_total={final_total}; response_totalTokens={total_tokens}", "Redis stream -> worker -> PostgreSQL", ["check AI usage reporting service", "verify Redis stream consumer", "query usage_hourly_aggregates"], "AI token event did not reach PostgreSQL with the same total as the API response")
    else:
        result.mark_fail("tenant resolved from AI response", "tenant_id unavailable", "AI auth / tenant context", ["check AI token principal", "validate tenant resolution"], "AI generation did not expose tenant context")

    results.append(result)
    return results


def ingestion_and_duplicate_tests(real_tenant_id=None):
    results = []

    tenant_id = real_tenant_id or "tenantA"
    event_id = f"suite-{int(time.time() * 1000)}"
    metric_name = "llm_tokens"
    units = 12
    baseline_total = read_usage_total(tenant_id, metric_name) or 0
    payload = {"eventId": event_id, "tenantId": tenant_id, "metricName": metric_name, "units": units, "timestamp": current_event_timestamp()}

    send_result = ScenarioResult("INGESTION", "valid event acceptance")
    status, body = http_json("POST", DEMO_BASE + "/metering/usage", payload, timeout=30)
    if status in (200, 202) and isinstance(body, dict) and body.get("status") in {"QUEUED", "DUPLICATE_IGNORED"}:
        final_total = wait_for_usage_total(tenant_id, metric_name, baseline_total + units, timeout_seconds=30)
        delta_total = (final_total if final_total is not None else 0) - baseline_total
        if final_total is not None and delta_total == units:
            send_result.mark_pass(f"usage event accepted and stored in PostgreSQL: delta={delta_total}, baseline={baseline_total}, final_total={final_total}")
        else:
            send_result.mark_fail("HTTP 200/202 + DB delta == units", f"status={status}; body={body}; baseline={baseline_total}; final_total={final_total}; delta={delta_total}", "Redis stream -> consumer -> PostgreSQL", ["verify demo ingestion path", "check Redis stream consumer", "query usage_hourly_aggregates"], "event was accepted over HTTP but not persisted to PostgreSQL with the expected exact delta")
    else:
        send_result.mark_fail("HTTP 200/202 with queued status", f"status={status}; body={body}", "demo ingestion endpoint", ["verify demo app health", "review redis stream writer", "inspect controller response"], "event submission failed")
    results.append(send_result)

    duplicate_result = ScenarioResult("INGESTION", "duplicate event protection")
    status2, body2 = http_json("POST", DEMO_BASE + "/metering/usage", payload, timeout=30)
    if status2 in (200, 202) and isinstance(body2, dict) and body2.get("status") == "DUPLICATE_IGNORED":
        duplicate_result.mark_pass("same event ID was rejected as duplicate")
    else:
        duplicate_result.mark_fail("duplicate rejected with DUPLICATE_IGNORED", f"status={status2}; body={body2}", "Redis deduplication / event-id set", ["check SETNX dedup key", "verify eventId uniqueness", "review TTL / key construction"], "duplicate guard did not trigger")
    results.append(duplicate_result)

    concurrent_result = ScenarioResult("INGESTION", "idempotency test: 25 concurrent duplicate requests")
    concurrent_tenant = real_tenant_id or "tenantA"
    concurrent_metric = "llm_tokens"
    baseline_concurrent = read_usage_total(concurrent_tenant, concurrent_metric) or 0
    shared_event_id = f"concurrent-{int(time.time() * 1000)}"
    base_payload = {"eventId": shared_event_id, "tenantId": concurrent_tenant, "metricName": concurrent_metric, "units": 100, "timestamp": current_event_timestamp()}
    barrier = threading.Barrier(25)

    def worker(idx):
        barrier.wait()
        status, body = http_json("POST", DEMO_BASE + "/metering/usage", base_payload, timeout=30)
        return {"status": status, "body": body}

    accepted = 0
    duplicate_ignored = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=25) as pool:
        futures = [pool.submit(worker, i) for i in range(25)]
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            body = result["body"]
            if result["status"] in (200, 202):
                if isinstance(body, dict) and body.get("status") == "DUPLICATE_IGNORED":
                    duplicate_ignored += 1
                else:
                    accepted += 1

    final_concurrent_total = wait_for_usage_total(concurrent_tenant, concurrent_metric, baseline_concurrent + 100, timeout_seconds=30)
    delta_concurrent = (final_concurrent_total if final_concurrent_total is not None else 0) - baseline_concurrent
    if accepted == 1 and duplicate_ignored == 24 and delta_concurrent == 100:
        concurrent_result.mark_pass(f"Exactly one event accepted, 24 duplicates rejected, DB delta={delta_concurrent}")
    else:
        concurrent_result.mark_fail("1 accepted, 24 duplicates rejected, DB delta=100", f"accepted={accepted}, duplicate_ignored={duplicate_ignored}, baseline={baseline_concurrent}, final_total={final_concurrent_total}, delta={delta_concurrent}", "Redis deduplication / race condition / PostgreSQL upsert", ["validate SETNX semantics", "confirm dedup key construction", "check TTL and expiry", "verify idempotent worker path", "query usage_hourly_aggregates"], "concurrent duplicates were not correctly deduplicated or persisted exactly once")
    results.append(concurrent_result)

    return results


def quota_threshold_tests(tenant_id=None, token=None):
    results = []
    if not tenant_id:
        result = ScenarioResult("QUOTA", "quota config setup")
        result.mark_fail("real tenant available", "no tenant id supplied", "tenant lookup / quotas", ["load admin tenants first"], "quota tests require a real existing tenant")
        results.append(result)
        return results

    current_status, current_body = http_json(
        "GET",
        f"{QUOTA_BASE}/api/v1/tenants/{tenant_id}/quota",
        headers=bearer_headers(token),
        timeout=30,
    )
    current_usage = current_body.get("currentUsage", 0) if isinstance(current_body, dict) else 0
    monthly_limit = max(int(current_usage) + 1000, 1000)

    config_status, config_body = http_json(
        "PUT",
        f"{QUOTA_BASE}/api/v1/tenants/{tenant_id}/quota/config",
        {"tierName": "FREE_TIER", "monthlyUnitLimit": monthly_limit, "hardCapEnabled": True, "alertThresholdPercent": 80, "unitRateDollars": 0.005},
        headers=bearer_headers(token),
        timeout=30,
    )
    if config_status not in (200, 201):
        result = ScenarioResult("QUOTA", "quota config setup")
        result.mark_fail("quota config updated successfully", f"status={config_status}; body={config_body}", "quota config route", ["check quota controller", "verify tenant quota config persistence"], "quota config could not be set on the real tenant")
        results.append(result)
        return results

    cases = [
        ("normal usage", 100),
        ("warning threshold", 700),
        ("limit reached", 200),
        ("hard cap exceeded", 100),
    ]
    projected_usage = int(current_usage)
    for label, units in cases:
        projected_usage += units
        percentage = (projected_usage / monthly_limit) * 100
        expected_state = "EXCEEDED" if projected_usage >= monthly_limit else "WARNING" if percentage >= 80 else "NORMAL"
        result = ScenarioResult("QUOTA", label)
        status, body = http_json("POST", QUOTA_BASE + "/api/v1/quota/evaluate", {"tenantId": tenant_id, "metricName": "llm_tokens", "units": units}, headers=internal_headers(), timeout=30)
        state_value = None
        if isinstance(body, dict):
            state_value = body.get("status") or body.get("quotaStatus") or body.get("state")
        if status in (200, 429) and state_value and expected_state.lower() in str(state_value).lower():
            result.mark_pass(f"quota state matched real semantics: {state_value} for units={units}")
        else:
            result.mark_fail(f"HTTP {status} and quota state {expected_state}", f"status={status}; body={body}", "quota evaluation / threshold logic", ["verify quota thresholds", "check 80% warning logic", "validate 100% hard-cap behavior"], "quota threshold check failed against the real configured quota semantics")
        results.append(result)
    return results


def billing_accuracy_tests(token=None, tenant_id=None):
    results = []
    result = ScenarioResult("BILLING", "invoice calculation")

    pricing_status, pricing_body = http_json("GET", GATEWAY_BASE + "/api/v1/admin/pricing", headers=bearer_headers(token), timeout=30)
    if pricing_status != 200 or not isinstance(pricing_body, dict):
        result.mark_fail("pricing endpoint returns numeric values", f"status={pricing_status}; body={pricing_body}", "admin pricing config / billing model", ["check /api/v1/admin/pricing route", "verify pricing repository", "inspect billing service"], "pricing metadata unavailable")
        results.append(result)
        return results

    price_per_1k_tokens = pricing_body.get("pricePer1kTokens")
    if price_per_1k_tokens is None:
        result.mark_fail("pricePer1kTokens present", pricing_body, "admin pricing config", ["confirm pricing schema", "inspect PlatformPricingResponse"], "pricing response missing unit price")
        results.append(result)
        return results

    try:
        platform_unit_price = Decimal(str(price_per_1k_tokens)) / Decimal("1000")
    except InvalidOperation:
        result.mark_fail("valid pricing number", pricing_body, "pricing serialization", ["check BigDecimal JSON parsing"], "pricePer1kTokens is not a valid decimal")
        results.append(result)
        return results

    tenant_status, tenant_body = http_json("GET", GATEWAY_BASE + "/api/v1/admin/tenants", headers=bearer_headers(token), timeout=30)
    if tenant_status != 200 or not isinstance(tenant_body, list):
        result.mark_fail("tenant list available", f"status={tenant_status}; body={tenant_body}", "tenant discovery", ["verify admin tenant endpoint"], "tenant list unavailable for billing test")
        results.append(result)
        return results

    tenant_id = tenant_id
    if not tenant_id:
        for record in tenant_body:
            if isinstance(record, dict):
                tenant_id = record.get("id") or record.get("tenantId")
                if tenant_id:
                    break

    if not tenant_id:
        result.mark_fail("tenant exists for billing test", tenant_body, "tenant seeding", ["verify tenant creation scripts"], "no tenant available for invoice test")
        results.append(result)
        return results

    quota_status, quota_body = http_json(
        "GET",
        f"{QUOTA_BASE}/api/v1/tenants/{tenant_id}/quota/config",
        headers=bearer_headers(token),
        timeout=30,
    )
    try:
        unit_price = Decimal(str(quota_body["unitRateDollars"]))
    except (InvalidOperation, KeyError, TypeError):
        unit_price = platform_unit_price

    # InvoiceRequest uses LocalDate, not epoch milliseconds.
    from datetime import date, timedelta
    end = date.today()
    start = end - timedelta(days=1)
    invoice_status, invoice_body = http_json(
        "POST",
        f"{GATEWAY_BASE}/api/v1/tenants/{tenant_id}/invoice",
        {"periodStart": start.isoformat(), "periodEnd": end.isoformat()},
        headers=bearer_headers(token),
        timeout=40,
    )

    if invoice_status not in (200, 201) or not isinstance(invoice_body, dict):
        result.mark_fail("invoice generated successfully", f"status={invoice_status}; body={invoice_body}", "tenant billing workflow", ["check invoice endpoint", "review InvoiceService generation flow", "verify billing scheduler"], "invoice generation endpoint did not return a valid invoice")
        results.append(result)
        return results

    total_units = invoice_body.get("totalUnitsConsumed")
    total_amount = invoice_body.get("totalAmountBilled")
    if total_units is not None and total_amount is not None:
        expected_amount = Decimal(str(total_units)) * unit_price
        actual_amount = Decimal(str(total_amount))
        if abs(expected_amount - actual_amount) <= Decimal("0.0001"):
            result.mark_pass(f"invoice math validated: totalUnitsConsumed={total_units}, totalAmountBilled={total_amount}")
        else:
            result.mark_fail(f"units * price = {expected_amount}", f"actual totalAmountBilled = {actual_amount}", "billing calculation / pricing config", ["check invoice generation math", "inspect PricingService.calculateCost", "confirm pricing repository values"], "billing math did not match the pricing model")
    else:
        result.mark_fail("invoice response contains totals", invoice_body, "billing response contract", ["inspect InvoiceReportResponse", "verify invoice generation response shape"], "invoice payload was missing billing totals")
    results.append(result)
    return results


def security_smoke_tests():
    results = []

    no_auth_result = ScenarioResult("SECURITY", "missing JWT rejection")
    status, body = http_json("GET", GATEWAY_BASE + "/api/v1/admin/tenants", timeout=30)
    if status in (401, 403):
        no_auth_result.mark_pass("missing JWT was rejected")
    else:
        no_auth_result.mark_fail("401/403 authentication required", f"status={status}; body={body}", "gateway security filters", ["check JWT authentication filter", "verify protected route config"], "protected admin route did not reject unauthenticated requests")
    results.append(no_auth_result)

    bad_auth_result = ScenarioResult("SECURITY", "invalid JWT rejection")
    status2, body2 = http_json("GET", GATEWAY_BASE + "/api/v1/admin/tenants", headers={"Authorization": "Bearer invalid-token"}, timeout=30)
    if status2 in (401, 403):
        bad_auth_result.mark_pass("invalid JWT was rejected")
    else:
        bad_auth_result.mark_fail("401/403 invalid token", f"status={status2}; body={body2}", "JWT validation", ["verify JWT secret", "check token parsing", "confirm auth filter"], "invalid JWT was accepted")
    results.append(bad_auth_result)

    return results


def load_smoke_test():
    results = []
    result = ScenarioResult("PERFORMANCE", "performance smoke")
    start = time.monotonic()
    errors = 0
    for _ in range(25):
        status, _ = http_json("GET", GATEWAY_BASE + "/actuator/health", timeout=10)
        if status != 200:
            errors += 1
    elapsed = time.monotonic() - start
    if errors == 0 and elapsed < 8.0:
        result.mark_pass(f"25 health checks completed in {elapsed:.2f}s with 0 errors")
    else:
        result.mark_fail("25 health checks succeed within 8.0s", f"errors={errors}, elapsed={elapsed:.2f}s", "gateway throughput / service responsiveness", ["check app load", "inspect latency", "verify no backend saturation"], "throughput smoke test failed")
    results.append(result)
    return results


def browser_route_smoke():
    results = []
    pages = [("home", "/"), ("playground", "/playground"), ("dashboard", "/dashboard"), ("developer sdk", "/developer/sdk"), ("docs", "/docs")]
    for label, path in pages:
        result = ScenarioResult("BROWSER", f"route smoke :: {label}")
        status, body = http_json("GET", FRONTEND_BASE + path, timeout=15)
        if status == 200:
            result.mark_pass(f"{path} served successfully")
        else:
            result.mark_fail("HTTP 200 route response", f"status={status}; body={body}", "frontend app routing / static hosting", ["check frontend index config", "verify route fallback", "inspect web server config"], f"route {path} failed")
        results.append(result)
    return results


def summary_report(results):
    failed = 0
    print("\n=== Final validation summary ===")
    for item in results:
        item.print_report()
        if not item.ok:
            failed += 1
    print(f"\nTotal failing scenarios: {failed}")
    return failed


def main():
    parser = argparse.ArgumentParser(description="Run TokenMeter validation suite")
    parser.add_argument("--skip-docker", action="store_true")
    parser.add_argument("--skip-live", action="store_true")
    parser.add_argument("--skip-java", action="store_true")
    parser.add_argument("--skip-sdk", action="store_true")
    parser.add_argument("--skip-frontend", action="store_true")
    parser.add_argument("--skip-security", action="store_true")
    parser.add_argument("--skip-quota", action="store_true")
    parser.add_argument("--skip-billing", action="store_true")
    parser.add_argument("--skip-load", action="store_true")
    parser.add_argument("--skip-browser", action="store_true")
    args = parser.parse_args()

    all_results = []

    if not args.skip_docker:
        all_results.extend(ensure_stack_started(args.skip_docker))

    if not args.skip_java:
        all_results.extend(run_java_tests())
    if not args.skip_sdk:
        all_results.extend(run_python_sdk_tests())
    if not args.skip_frontend:
        all_results.extend(run_frontend_build())

    if not args.skip_live:
        all_results.extend(check_service_healths())
        if not args.skip_security:
            all_results.extend(security_smoke_tests())
        auth_results, token, api_key, tenant_ids = admin_login_and_tenants()
        all_results.extend(auth_results)
        real_tenant_id = tenant_ids[0] if tenant_ids else None
        if token:
            all_results.extend(ai_generate_and_usage(api_key, tenant_ids))
        all_results.extend(ingestion_and_duplicate_tests(real_tenant_id))
        if not args.skip_quota:
            all_results.extend(quota_threshold_tests(real_tenant_id, token))
        if not args.skip_billing:
            all_results.extend(billing_accuracy_tests(token, real_tenant_id))
        if not args.skip_load:
            all_results.extend(load_smoke_test())
        if not args.skip_browser:
            all_results.extend(browser_route_smoke())

    return summary_report(all_results)


if __name__ == "__main__":
    sys.exit(main())
