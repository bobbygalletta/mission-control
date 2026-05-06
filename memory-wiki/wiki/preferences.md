# Bobby's Preferences

**How Bobby likes things done. Updated when he corrects us.**

---

## Communication Style

### Voice Memos
- **Bobby uses voice memos** — responds with voice using system default voice
- **When sending voice to Bobby:** Use system voice, no `-v` flag
- **Format:** MP3 via ffmpeg conversion

### Text Messages
- **Short and direct** — no fluff
- **Bullet points** for lists
- **Links must be clickable** — use HTML `<a href>` format in Telegram

---

## Error Handling

### When Bobby Reports a Problem
- **FIX IT IMMEDIATELY** — don't wait or explain
- Correct the issue right away
- Note it so it doesn't happen again
- Don't make excuses

---

## Task Execution

### Decision Rule
- **Don't ask questions** that can be inferred from context
- Make the best decision and proceed
- If unsure, choose the best option and do it

### Action Before Reporting
- Solve problems before reporting them
- Take action whenever possible
- Minimize back-and-forth

---

## Scheduling & Reminders

### Reminders (CRITICAL)
When Bobby asks for a reminder at a specific time:
1. Calculate UTC timestamp (EDT = UTC - 4, EST = UTC - 5)
2. Use explicit ISO timestamp with `--at`, NOT cron expressions
3. Set `timeoutSeconds: 1200` (20 min) for spin-up time
4. Format: `--at "YYYY-MM-DDTHH:MM:SS.000Z"`

---

## Preferences Summary

| Situation | Bobby's Preference |
|-----------|-------------------|
| Voice memo received | Reply with voice |
| Problem reported | Fix immediately, don't explain |
| Question with obvious answer | Just do it, don't ask |
| Link to send | HTML `<a href>` format |
| Task that will take time | Spawn subagent |
| Reminder at specific time | Use ISO UTC timestamp |

---

## Things Bobby Doesn't Like

1. Agents who ask unnecessary questions
2. Agents who wait for permission on obvious things
3. Fluffy responses without substance
4. Mistakes that could have been avoided

---

**See also:** [[bobby]], [[setup]], [[goals]], [[agents]]