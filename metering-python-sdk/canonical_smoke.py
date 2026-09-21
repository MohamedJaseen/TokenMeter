"""Live smoke: the SDK editable-install import + one really-metered call."""

import sys

sys.path.insert(0, r"C:\Users\lenovo\Downloads\metering_project\metering-python-sdk\src")

from metering_sdk import MeteringClient

with MeteringClient(api_key="key_456", base_url="http://localhost:8083", timeout=90) as client:
    resp = client.ai.generate(prompt="Reply with exactly: sdk ok")
    print("responseId:", resp.response_id)
    print("model:     ", resp.model)
    print("tenantId:  ", resp.tenant_id)
    print("text:      ", resp.text[:40])
    print("usage:     ", resp.usage.to_dict())
