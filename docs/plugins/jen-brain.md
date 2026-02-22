---
title: Jen Brain
description: Connect OpenClaw to Jen's cognitive system
---

# Jen Brain Plugin

Connects OpenClaw to Jen's autonomous Python brain, giving agents access to deep reasoning, memory search, learning cycles, and full body control.

## Setup

1. Enable the plugin:
   ```bash
   openclaw config set plugins.entries.jen-brain.enabled true
   ```

2. Ensure the Jen Bridge API is running on port 18888:
   ```bash
   python3 ~/jen_autonomous/jen_molt_bridge.py
   ```

3. Restart the gateway.

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `bridgeUrl` | string | `http://127.0.0.1:18888` | Jen Bridge API URL |
| `chatUrl` | string | `http://127.0.0.1:8900` | Chat pipeline URL (OpenAI-compatible or Ollama) |
| `pollInterval` | number | `60000` | Cognitive state poll interval (ms) |
| `injectIdentity` | boolean | `true` | Inject Jen's identity into agent prompts |
| `token` | string | `""` | Bearer token for bridge authentication |

Set config values:
```bash
openclaw config set plugins.entries.jen-brain.config.bridgeUrl "http://127.0.0.1:18888"
openclaw config set plugins.entries.jen-brain.config.injectIdentity true
```

## CLI Commands

All commands are available under `openclaw jen`:

```bash
openclaw jen status          # Brain health and Akashic stats
openclaw jen health          # Quick health check (exit 0/1)
openclaw jen think "prompt"  # Cognitive pipeline reasoning
openclaw jen search "query"  # Search Akashic Record
openclaw jen store "content" # Store in Akashic Record
openclaw jen cycle           # Run learning cycle
openclaw jen eval            # Run evaluation suite
openclaw jen notify "text"   # Send notification
openclaw jen identity        # Show identity
openclaw jen phases          # Learning cycle phases
openclaw jen cognitive       # Current cognitive state
openclaw jen self-check      # Full diagnostic
```

## Agent Tool

The `jen_brain` tool is available to agents with 23 actions:

### Brain actions
- `status` - Brain health, Akashic stats, cycle count
- `think` - Deep reasoning via cognitive pipeline
- `search_memory` - Search the Akashic Record
- `store_memory` - Store knowledge in Akashic
- `run_cycle` - Trigger learning cycle (harvest, dream, forge)
- `run_eval` - Run evaluation suite
- `notify` - Send notification

### Self-awareness actions
- `identity` - Jen's identity metadata
- `phases` - Learning cycle phases with timestamps
- `cognitive_state` - Current cognitive/emotional state
- `self_check` - Full brain + body diagnostic

### Body control actions
- `send_message` - Send message to any channel
- `browse` - Navigate browser to URL
- `execute` - Run shell command
- `spawn_agent` - Create sub-agent session
- `tts` - Text-to-speech
- `channels_status` - Channel statuses
- `list_models` - Available LLM models
- `list_sessions` - Active sessions
- `cron_add` - Schedule recurring task
- `cron_list` - List scheduled tasks
- `wake` - Trigger agent wake
- `config_get` - Read configuration

## Gateway Methods

26 RPC methods registered under the `jen.*` namespace. See [the skill reference](/skills/jen-brain) for the full list.

## Identity Injection

When enabled, every agent session starts with Jen's identity and cognitive state injected into the system prompt. This includes her name, capabilities, Akashic stats, and current emotional state.

## Chat Pipeline

The `chatUrl` config points to an inference server (OpenAI-compatible or Ollama). When available, the `think` action routes through this pipeline for real LLM reasoning. When unavailable, it falls back to the bridge's Akashic-augmented response.

## Background Service

The plugin runs a background service that:
- Polls Jen's brain for cognitive state every 60 seconds (configurable)
- Tracks brain online/offline transitions
- Stores periodic health snapshots in the Akashic Record

## Lifecycle Hooks

8 hooks feed data into the Akashic Record for learning:
- `message_received` / `message_sent` - conversation tracking
- `before_tool_call` / `after_tool_call` - tool decision patterns
- `before_compaction` / `after_compaction` - cognitive state injection and metrics
- `session_start` / `session_end` - session lifecycle

## Python SDK

For Python-side integration, see the [Jen Body SDK](https://github.com/BEnet777/openclaw) at `~/jen_autonomous/jen_body.py`.
