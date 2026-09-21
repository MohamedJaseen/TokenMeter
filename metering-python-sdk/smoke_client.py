"""Live smoke: SDK's own MeteringClient -> AI service -> real Gemini.

Requires:
  * the CMOS train up (ai-service on :8083)
  * a live tenant API key (seeded: tenantB -> key_456)
"""
import os
import sys

os.environ["PYTHONDONTWRITEBYTECODE"] = "1"

sys.path.insert(0, r"C:\Users\lenovo\Downloads\metering_project\metering-python-sdk\src")

from metering_sdk import MeteringClient

client = MeteringClient(api_key="key_456", base_url="http://localhost:8083", timeout=90.0)
try:
    result = client.ai.generate(prompt="Reply with exactly: sdk is alive")
    print("responseId:", result.response_id)
    print("model:     ", result.model)
    print("tenantId:  ", result.tenant_id)
    print("text:      ", result.text)
    print("usage:     ", result.usage.to_dict())
    print("to_dict:   ", result.to_dict())
finally:
    client.close()
