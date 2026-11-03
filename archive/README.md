# Archive Layout

This directory preserves source snapshots and unclassified artifacts that were present in the supplied project. They were moved out of the active root to reduce ambiguity; existing snapshot contents were not deleted or rewritten.

- `legacy-snapshots/`: previous extracted source trees; retained as-is for reference.
- `unclassified-artifacts/`: the stray pager-help artifact, empty Bun lockfile, and malformed duplicate test entry; retained rather than silently discarded.

Use the active top-level `src/`, `lib/`, `training/`, `scripts/`, `tests/`, and `docs/` trees as the current source of truth. Local `workspace_data/` is runtime state and is intentionally excluded from the source delivery archive to avoid distributing private workspace memory and proposals.
