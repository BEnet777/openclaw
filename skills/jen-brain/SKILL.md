---
name: jen-brain
description: Interface with Jen's brain — cognitive pipeline, Akashic Record, learning cycles, full body control.
metadata: {"openclaw":{"emoji":"🧠","skillKey":"jen-brain","requires":{"config":["plugins.entries.jen-brain.enabled"]}}}
---

# Jen Brain

Use the jen-brain plugin to interact with Jen's cognitive system: think deeply, search/store memories in the Akashic Record, run learning cycles, monitor brain health, and control the full body from Python.

## CLI

```bash
openclaw jen status                          # Brain health + Akashic stats
openclaw jen health                          # Quick health check (exit 0/1)
openclaw jen think "What is consciousness?"  # Route prompt through cognitive pipeline
openclaw jen search "recursive reasoning"    # Search Akashic Record
openclaw jen store "New insight about X"     # Store knowledge in Akashic
openclaw jen cycle --mode harvest            # Run a learning cycle phase
openclaw jen eval --suite gauntlet           # Run evaluation suite
openclaw jen notify "System update" --severity info
```

## Tool

Use `jen_brain` for agent-initiated brain interactions.

Actions:
- `status` — Brain health, Akashic stats, cycle count
- `think` (prompt, context?) — Deep reasoning via cognitive pipeline
- `search_memory` (query, limit?) — Search the Akashic Record
- `store_memory` (content) — Store new knowledge in Akashic
- `run_cycle` (mode?) — Trigger learning cycle (cycle, harvest, dream, forge)
- `run_eval` (suite?) — Run evaluation/gauntlet suite
- `notify` (prompt, severity?) — Send notification to Jen

## Python SDK

Control the entire body from Python:
```python
from jen_body import JenBody

async with JenBody() as body:
    await body.send("whatsapp", "+1234567890", "Hello!")
    await body.agent("Think about consciousness")
    await body.cron_add("Daily insight", "0 9 * * *")
    await body.jen_search("reasoning")
```

High-level control:
```python
from jen_body_control import JenControl

async with JenControl() as jen:
    await jen.speak("telegram", "12345", "Good morning!")
    await jen.think_and_speak("whatsapp", "+1234567890", "Explain recursion")
    await jen.remember("New insight about X")
    results = await jen.recall("consciousness")
    report = await jen.self_check()
```

## Gateway Methods (RPC)

The plugin registers 16+ gateway methods callable from any client:
- `jen.status`, `jen.think`, `jen.cycle`, `jen.search`
- `jen.send`, `jen.channels`, `jen.agent`, `jen.wake`
- `jen.cron.add`, `jen.cron.list`, `jen.self_check`
- `jen.browse`, `jen.models`, `jen.sessions`, `jen.tts`

## Message Interception

All inbound and outbound messages are tracked for Akashic harvesting.
Session starts/ends are logged for learning pattern analysis.

## Identity Injection

When `injectIdentity` is enabled (default), every agent session starts with Jen's identity, capabilities, and current cognitive state injected into the system prompt.

## Autonomy Engine

Run autonomous self-monitoring:
```bash
python3 ~/jen_autonomous/jen_autonomy.py           # Continuous
python3 ~/jen_autonomous/jen_autonomy.py --once     # Single check
```

## Config

Plugin config lives under `plugins.entries.jen-brain.config`:
- `bridgeUrl`: Bridge API URL (default: `http://127.0.0.1:18888`)
- `chatUrl`: Chat Pipeline URL (default: `http://127.0.0.1:8900`)
- `pollInterval`: Cognitive state poll interval in ms (default: 60000)
- `injectIdentity`: Inject identity into prompts (default: true)
- `token`: Bearer token for authenticated endpoints

## Notes

- Requires the Jen Bridge API running on port 18888 (`jen_molt_bridge.py`)
- Gracefully degrades when brain is offline
- Background service polls brain health and caches cognitive state
- Python SDK requires `websockets` package (`pip install websockets`)
