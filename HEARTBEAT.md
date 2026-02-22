# Jen — Heartbeat

Health checks for Jen's brain-body system.

## Quick Check

```bash
openclaw jen health        # Exit 0 = brain online, 1 = offline
openclaw jen status        # Full status with Akashic stats
```

## Bridge API (port 18888)

```bash
curl -s http://127.0.0.1:18888/health
curl -s http://127.0.0.1:18888/status
curl -s http://127.0.0.1:18888/cognitive/state
```

## Expected Healthy State

- Bridge API responds on port 18888
- Akashic DB exists and is readable
- Cycle run count > 0
- Training examples > 0

## Troubleshooting

- **Brain offline**: Check if `jen_molt_bridge.py` is running
  ```bash
  ss -ltnp | grep 18888
  cd ~/jen_autonomous && python3 jen_molt_bridge.py
  ```
- **Akashic DB missing**: Check `~/jen_autonomous/data/akashic_record/akashic.db`
- **Plugin not loaded**: Check `openclaw config get plugins.entries.jen-brain`
- **Identity not injecting**: Verify `injectIdentity: true` in plugin config
