# demo-client

A tiny **customer-facing demo application** that uses your `metering-python-sdk`.
It is *not* another backend service of the platform — it is the kind of app that
**your** customers build on top of your metered API.

## What it does

1. Reads a tenant API key from `.env` (never hard-coded).
2. Calls the one metered SDK operation: `POST {ai}/api/v1/ai/generate`.
3. Prints the generated text **and** the token usage that was metered to the
   key's tenant — showing your pay-per-token billing in action.

## Run it

```bash
cd demo-client
pip install -r requirements.txt
copy .env.example .env      # put your real tenant API key there
python app.py "What is Redis Streams?"
```

Example output (live, gateway → AI service → Gemini):

```text
responseId: gemini-05bb2a49-...-dfca6e3f398d
model:      gemini-3.5-flash-lite
tenantId:   tenantB
text:       Redis Streams are append-only log structures...
usage:      {'input': 7, 'output': 3, 'total': 10}
```

## Layout
– platform, SDK, gateway: handled elsewhere
   (compose stack + metering-python-sdk/)
– this folder: your customer app, nothing else
```