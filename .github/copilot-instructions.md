# Copilot instructions

The canonical instructions for this package are in [AGENTS.md](../AGENTS.md).

Key points when suggesting code here:

- Import from `thetowersdk/data`, `/save`, `/node`, `/formatting` or `/mechanics`.
  Never suggest `thetowersdk/internal/*` — it is not public API.
- `extract*FromSaveRoot()` returns `T | null`; always guard the result.
- Save arrays are positional and over-allocated; prefer an unlock flag over a level to decide
  whether a slot is in use.
- Named exports only, kebab-case file names, and every public module is exported from its
  `src/<area>/index.ts` barrel.
