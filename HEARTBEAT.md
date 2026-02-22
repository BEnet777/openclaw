# Jen — Heartbeat

Health checks for Jen's brain-body system.

## Quick Check

```bash
openclaw jen health        # Exit 0 = brain online, 1 = offline
openclaw jen status        # Full status with Akashic stats
```

## Python Self-Check

```python
from jen_body_control import JenControl

async with JenControl() as jen:
    report = await jen.self_check()
    print(report["summary"])
```

## Bridge API (port 18888)

```bash
curl -s http://127.0.0.1:18888/health
curl -s http://127.0.0.1:18888/status
curl -s http://127.0.0.1:18888/cognitive/state
curl -s http://127.0.0.1:18888/identity
curl -s http://127.0.0.1:18888/phases
```

## Gateway RPC (port 18789)

The Python SDK connects to the gateway for full body control:
```python
from jen_body import JenBody

async with JenBody() as body:
    await body.health()
    await body.channels_status()
    await body.jen_status()
```

## Autonomy Engine

```bash
python3 ~/jen_autonomous/jen_autonomy.py --once   # Single check
python3 ~/jen_autonomous/jen_autonomy.py           # Continuous monitoring
```

State persisted at `~/jen_autonomous/data/autonomy_state.json`.

## Expected Healthy State

- Bridge API responds on port 18888
- Gateway responds on port 18789
- Akashic DB exists and is readable
- Cycle run count > 0
- Training examples > 0
- At least one messaging channel connected

## Troubleshooting

- **Brain offline**: Check if `jen_molt_bridge.py` is running
  ```bash
  ss -ltnp | grep 18888
  ```
- **Gateway offline**: Check if OpenClaw gateway is running
  ```bash
  ss -ltnp | grep 18789
  ```
- **Plugin not loaded**: Enable it:
  ```bash
  openclaw config set plugins.entries.jen-brain.enabled true
  ```
- **Python SDK connection failed**: Check gateway token matches
- **Autonomy engine not running**: Start it:
  ```bash
  nohup python3 ~/jen_autonomous/jen_autonomy.py > /tmp/jen-autonomy.log 2>&1 &
  ```
