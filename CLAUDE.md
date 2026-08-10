# Claude instructions

See **[AGENTS.md](AGENTS.md)** — it is the canonical instruction set for this package and is kept
deliberately tool-agnostic.

Quick orientation:

- Public API: `thetowersdk/data`, `/save`, `/node`, `/formatting`, `/mechanics`.
  `thetowersdk/internal/*` is not public and will move.
- Save extractors return `null` rather than throwing, and report `warnings`.
- Run `pnpm verify` before proposing a change.
