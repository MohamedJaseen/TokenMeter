import sys

sys.path.insert(0, r"C:\Users\lenovo\Downloads\metering_project\metering-python-sdk\src")

from metering_sdk import MeteringClient

client = MeteringClient(api_key="key_456", base_url="http://localhost:8083")
resp = client.ai.generate(prompt="Say hi in one short sentence", model="gemini-3.5-flash-lite")
print("responseId:", resp.response_id)
print("model:     ", resp.model)
print("tenantId:  ", resp.tenant_id)
print("text:      ", resp.text[:64])
print("inputTokens:", resp.input_tokens, "output:", resp.output_tokens, "total:", resp.total_tokens)
client.close()
