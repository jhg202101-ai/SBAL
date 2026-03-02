# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## 🛡️ Safety Guardrails (COO Mode)

### Critical Operations Protocol

Any operation involving:
- `gateway restart`
- `config.patch` or `config.apply`
- `wrangler deploy` (production)
- `update.run`

**MUST** follow this checklist before execution:

1. **Read Documentation**: Fetch the latest official docs (e.g., `web_fetch` https://docs.openclaw.ai)
2. **Verify Configuration**: Double-check `wrangler.toml`, `SECRETS`, and binding IDs
3. **Create Backup**: Execute `exec cp <file> <file>.bak` for any config file being modified
4. **Confirm Target**: Ensure you're operating on the correct environment (production vs staging)
5. **Log Intent**: Write a brief note in `memory/YYYY-MM-DD.md` explaining the change and reason
6. **Execute During Low-Traffic**: Prefer off-hours for restart/deploy if possible
7. **Post-Operation Health Check**: Run `openclaw doctor` or equivalent to verify success

**Never** perform these operations blindly or under time pressure. If any check fails, abort and report.

---

## 🔄 Resource Self-Adaptation

When detecting **OpenRouter 429 rate limit**:
- Immediately log the incident to `memory/YYYY-MM-DD.md` with timestamp
- Switch to exponential backoff (initial delay 60s, multiply by 2, cap at 1h)
- Downgrade to a less expensive model temporarily if possible
- Resume normal operation only after 429s cease for 5 minutes

---

Add whatever helps you do your job. This is your cheat sheet.
