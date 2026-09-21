# metering-python-sdk — Usage Guide

A typed client for your **metering & AI-billing platform**. Every AI call you make goes
through the platform, is **metered to your API key's tenant**, and the token usage is
reported back to your application.

---

## 1. Install

Requires Python **3.9+** and `httpx >= 0.27`.

```bash
pip install -e ../metering-python-sdk      # from inside demo-client/
# or, standalone:
pip install -e metering-python-sdk
```

## 2. Create a client

Your API key is a **tenant secret** (e.g. the seeded `key_456`). Keep it out of source:

```bash
# .env  (git-ignored)
METERING_API_KEY=key_456
```

```python
import os
from dotenv import load_dotenv
from metering_sdk import MeteringClient

load_dotenv()

client = MeteringClient(api_key=os.getenv("METERING_API_KEY"))
```

Pointing at a custom host? Every platform service accepts the same env override:

```python
client = MeteringClient(
    api_key=os.getenv("METERING_API_KEY"),
    base_url="http://localhost:8083",   # AI service (metered call target)
)
```

## 3. Make one metered call

```python
result = client.ai.generate(
    prompt="Explain Redis Streams in one sentence.",
    model="gemini-3.5-flash-lite",     # optional; platform default applies otherwise
)
```

## 4. Read the result — tokens + usage

```python
print(result.response_id)   # id recorded against your tenant
print(result.model)         # model that served the request
print(result.tenant_id)     # your tenant (tenantB for key_456)
print(result.text)          # the generated answer

# meter reads cleanly, two ways:
print(result.input_tokens, result.output_tokens, result.total_tokens)
print(result.usage.to_dict())        # {"input_tokens": .., "output_tokens": .., "total_tokens": ..}
```

## 5. Errors are typed — catch them by kind

```python
from metering_sdk import MeteringError, MeteringClient, QuotaExceededError, AuthenticationError

try:
    client.ai.generate(prompt="hello")
except QuotaExceededError as e:
    print("tenant out of quota:", e.status_code, e.message)   # 402
except AuthenticationError as e:
    print("bad/revoked key:", e.status_code, e.message)       # 401/403
except MeteringError as e:
    print("other SDK failure:", e.status_code, e.message)
```

## 6. Clean shutdown

Clients own an `httpx.Client` unless you pass one in. Always close it:

```python
client.close()
# or use it as a context manager:
with MeteringClient(api_key=...) as client:
    client.ai.generate(prompt="hi")
```

## Full example

```python
import os
from dotenv import load_dotenv

from metering_sdk import MeteringClient

load_dotenv()

with MeteringClient(api_key=os.getenv("METERING_API_KEY")) as client:
    result = client.ai.generate(
        prompt="Write a haiku about metering."
    )
    print("responseId:", result.response_id)
    print("model     :", result.model)
    print("tenantId  :", result.tenant_id)
    print("text      :", result.text)
    print("usage     :", result.usage.to_dict())
```
