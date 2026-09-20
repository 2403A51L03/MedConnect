---
name: Nested npm preview flags
description: Passing Vite host and port flags through a root npm script for the Replit preview workflow.
---

When a root preview script starts a client through npm, pass Vite arguments after the nested command’s `--` separator, for example `npm run dev --prefix client -- --host ... --port ...`.

**Why:** Passing flags after a wrapper script can make npm consume them as its own options, leaving Vite on its default port while the workflow waits on port 5000.

**How to apply:** For combined API/client workflows, verify the workflow log shows Vite listening on 0.0.0.0:5000 before changing application code or restarting repeatedly.

For Replit web previews, prefer a frontend-only webview workflow on port 5000 plus a separate console workflow for the backend API on port 4000. This keeps the preview workflow’s port unambiguous.

**Why:** A combined workflow can expose both ports even when it waits for 5000, which may cause the preview surface to target the API instead of the frontend.

**How to apply:** Keep the Vite proxy pointed at the internal API port and verify the webview workflow reports only `openPorts: [5000]`.