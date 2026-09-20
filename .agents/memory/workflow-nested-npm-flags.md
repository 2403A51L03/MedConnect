---
name: Nested npm preview flags
description: Passing Vite host and port flags through a root npm script for the Replit preview workflow.
---

When a root preview script starts a client through npm, pass Vite arguments after the nested command’s `--` separator, for example `npm run dev --prefix client -- --host ... --port ...`.

**Why:** Passing flags after a wrapper script can make npm consume them as its own options, leaving Vite on its default port while the workflow waits on port 5000.

**How to apply:** For combined API/client workflows, verify the workflow log shows Vite listening on 0.0.0.0:5000 before changing application code or restarting repeatedly.