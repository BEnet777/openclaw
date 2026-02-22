---
name: jen-brain
description: Interface with Jen's brain — cognitive pipeline, Akashic Record, learning cycles, full body control.
metadata: {"openclaw":{"emoji":"🧠","skillKey":"jen-brain","requires":{"config":["plugins.entries.jen-brain.enabled"]}}}
---

# Jen Brain

Use the jen-brain plugin to interact with Jen's cognitive system: think deeply, search/store memories in the Akashic Record, run learning cycles, monitor brain health, and control the full body from Python.

## CLI

```bash
# Brain operations
openclaw jen status                          # Brain health + Akashic stats
openclaw jen health                          # Quick health check (exit 0/1)
openclaw jen think "What is consciousness?"  # Route prompt through cognitive pipeline
openclaw jen search "recursive reasoning"    # Search Akashic Record
openclaw jen store "New insight about X"     # Store knowledge in Akashic
openclaw jen cycle --mode harvest            # Run a learning cycle phase
openclaw jen eval --suite gauntlet           # Run evaluation suite
openclaw jen notify "System update" --severity info

# Self-awareness
openclaw jen identity                        # Show Jen's identity
openclaw jen phases                          # Learning cycle phases with timestamps
openclaw jen cognitive                       # Current cognitive state
openclaw jen self-check                      # Full diagnostic (brain + body)
```

## Tool

Use `jen_brain` for agent-initiated brain and body interactions.

### Brain actions
- `status` — Brain health, Akashic stats, cycle count
- `think` (prompt, context?) — Deep reasoning via cognitive pipeline
- `search_memory` (query, limit?) — Search the Akashic Record
- `store_memory` (content) — Store new knowledge in Akashic
- `run_cycle` (mode?) — Trigger learning cycle (cycle, harvest, dream, forge)
- `run_eval` (suite?) — Run evaluation/gauntlet suite
- `notify` (prompt, severity?) — Send notification to Jen

### Self-awareness actions
- `identity` — Get Jen's identity (name, creator, version, born date)
- `phases` — List all learning cycle phases with last-run timestamps
- `cognitive_state` — Current cognitive/emotional state and Akashic stats
- `self_check` — Full diagnostic: brain + body + channels + consciousness

### Body control actions
- `send_message` (channel, to, message, thinking?) — Send message to any channel
- `browse` (url) — Navigate browser to URL
- `execute` (command) — Run shell command
- `spawn_agent` (task, thinking?) — Create sub-agent session
- `tts` (text) — Text-to-speech
- `channels_status` — List all messaging channel statuses
- `list_models` — List available LLM models
- `list_sessions` — List active agent sessions
- `cron_add` (message, schedule) — Schedule recurring task
- `cron_list` — List all scheduled tasks
- `wake` (text) — Trigger agent wake event
- `config_get` (path?) — Read OpenClaw configuration

## Python SDK

Control the entire body from Python:
```python
from jen_body import JenBody

async with JenBody() as body:
    # Core gateway methods
    await body.send("whatsapp", "+1234567890", "Hello!")
    await body.agent("Think about consciousness")
    await body.cron_add("Daily insight", "0 9 * * *")
    await body.health()
    await body.channels_status()
    await body.models_list()
    await body.sessions_list()
    await body.agents_list()
    await body.node_list()
    await body.skills_status()

    # Jen-specific methods (26 methods)
    await body.jen_status()
    await body.jen_think("What is recursive reasoning?")
    await body.jen_search("consciousness", limit=10)
    await body.jen_store("New insight", metadata={"source": "research"})
    await body.jen_cycle("harvest")
    await body.jen_send("telegram", "12345", "Hello!", thinking="medium")
    await body.jen_channels()
    await body.jen_agent("Analyze this data", thinking="high")
    await body.jen_cron_add("Daily check", "0 9 * * *")
    await body.jen_cron_list()
    await body.jen_cron_remove("old-job")
    await body.jen_cron_run("harvest-job")
    await body.jen_self_check()
    await body.jen_wake("urgent message")
    await body.jen_browse("https://example.com")
    await body.jen_models()
    await body.jen_sessions()
    await body.jen_sessions_history("session-key")
    await body.jen_sessions_send("session-key", "message")
    await body.jen_sessions_spawn("Research AI safety")
    await body.jen_tts("Hello world")
    await body.jen_exec("ls -la")
    await body.jen_config_get()
    await body.jen_config_set("key", "value")
    await body.jen_health()
    await body.jen_notify("Alert!", severity="warn")
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
    await jen.browse("https://example.com")
    await jen.execute("uname -a")
    await jen.spawn_agent("Research quantum computing")
    await jen.say_aloud("Hello from Jen")
    await jen.notify("System update")
```

## Gateway Methods (RPC)

The plugin registers 26 gateway methods callable from any client:

Brain operations:
- `jen.status` — Brain health + Akashic stats
- `jen.think` — Route prompt through cognitive pipeline
- `jen.cycle` — Trigger learning cycle
- `jen.search` — Search Akashic Record
- `jen.store` — Store knowledge in Akashic
- `jen.notify` — Send notification to brain
- `jen.health` — Combined brain+body health check
- `jen.self_check` — Full diagnostic report

Body control:
- `jen.send` — Send message (direct or agent-routed)
- `jen.channels` — List channel statuses
- `jen.agent` — Run agent with Jen identity
- `jen.wake` — Trigger agent wake
- `jen.browse` — Browser automation
- `jen.exec` — Execute shell command
- `jen.models` — List available models
- `jen.tts` — Text-to-speech

Session management:
- `jen.sessions` — List sessions
- `jen.sessions.history` — Read session transcript
- `jen.sessions.send` — Send to a session
- `jen.sessions.spawn` — Spawn sub-agent

Scheduling:
- `jen.cron.add` — Create scheduled job
- `jen.cron.list` — List jobs
- `jen.cron.remove` — Delete job
- `jen.cron.run` — Trigger job

Configuration:
- `jen.config.get` — Read config
- `jen.config.set` — Write config

## Bridge API (Python Side)

The brain exposes orchestration endpoints on port 18888:
- `POST /body/call` — Generic gateway method call
- `POST /body/message` — Send message through body
- `POST /body/cron` — Manage cron jobs
- `POST /body/shell` — Execute shell command
- `POST /body/browse` — Browser automation
- `POST /body/memory` — Store/search memory
- `POST /body/agent` — Run agent session
- `GET /body/channels` — Channel statuses
- `GET /body/health` — Combined health
- `GET /body/sessions` — List sessions
- `GET /body/models` — Available models

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
