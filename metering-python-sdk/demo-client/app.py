"""Demo client — a small customer-facing app that consumes the metering SDK.

Run (from the ``demo-client`` folder):

    pip install -r requirements.txt
    copy .env.example .env        # then put your key in .env
    python app.py "Hello, meter!"

The prompt is metered to the API key's tenant the same way any of your
customer applications will call the platform.
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

from metering_sdk import MeteringClient

load_dotenv()


def main() -> None:
    api_key = os.getenv("METERING_API_KEY")
    if not api_key:
        sys.exit(
            "METERING_API_KEY is not set. "
            "Copy .env.example to .env and fill in your tenant API key."
        )

    prompt = " ".join(sys.argv[1:]).strip() or "Tell me one short fact about Redis."
    base_url = os.getenv("METERING_BASE_URL", "http://localhost:8083")

    client = MeteringClient(api_key=api_key, base_url=base_url, timeout=120.0)
    try:
        result = client.ai.generate(prompt=prompt)
    except Exception as exc:  # typed SDK errors surface here
        print(f"[metering error] {exc}")
        return
    finally:
        client.close()

    print("responseId:", result.response_id)
    print("model:     ", result.model)
    print("tenantId:  ", result.tenant_id)
    print("text:      ", result.text)
    print("usage:     ", result.usage.to_dict())


if __name__ == "__main__":
    main()
