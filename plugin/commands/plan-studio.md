---
description: Open the current (or a named) plan in the local Plan Studio browser app
argument-hint: "[plan-slug]"
allowed-tools: Bash(bun run *)
---

Open Plan Studio in the browser. If an argument is given, treat it as a plan
slug; otherwise open the most recently modified plan.

Run this to launch (it ensures the local server is running first):

```
!bun run /home/sura/.claude/plan-studio/bin/launch.ts $ARGUMENTS --force
```

After it opens, tell the user the URL it printed.
