# CrewFind Agent Instructions

Before changing this project, read `docs/CREWFIND_PROJECT_CONTEXT.md` completely.

Treat that document as the single source of truth for product, brand, design, negative constraints, and roadmap order. Follow the roadmap order unless the user explicitly overrides it.

Preserve existing user changes. Make the smallest change needed for the current task.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
