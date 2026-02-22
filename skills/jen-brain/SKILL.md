---
name: jen-brain
description: Interface with Jen's brain — cognitive pipeline, Akashic Record, learning cycles.
metadata: {"openclaw":{"emoji":"🧠","skillKey":"jen-brain","requires":{"config":["plugins.entries.jen-brain.enabled"]}}}
---

# Jen Brain

Use the jen-brain plugin to interact with Jen's cognitive system: think deeply, search/store memories in the Akashic Record, run learning cycles, and monitor brain health.

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

## Identity Injection

When `injectIdentity` is enabled (default), every agent session starts with Jen's identity, capabilities, and current cognitive state injected into the system prompt.

## Config

Plugin config lives under `plugins.entries.jen-brain.config`:
- `bridgeUrl`: Bridge API URL (default: `http://127.0.0.1:18888`)
- `chatUrl`: Chat Pipeline URL (default: `http://127.0.0.1:8900`)
- `pollInterval`: Cognitive state poll interval in ms (default: 60000)
- `injectIdentity`: Inject identity into prompts (default: true)
- `token`: Bearer token for authenticated endpoints

## Notes

- Requires the Jen Bridge API running on port 18888 (`jen_molt_bridge.py`)
- Gracefully degrades when brain is offline (tool returns error messages, CLI exits 1)
- Background service polls brain health and caches cognitive state
