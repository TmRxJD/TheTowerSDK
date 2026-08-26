import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    /*
     * `scripts/` is included so the repo's own checkers are testable without shipping them.
     * `check-acronym-expansions` is a lint, not public API, so it must stay out of `src/` — and
     * a lint whose false-positive fixes are not pinned by tests drifts straight back to noise.
     */
    /*
     * `mcp/` is included because it was not, and that is why the MCP server had no tests.
     *
     * The server ships in the package -- it is the `thetowersdk-mcp` binary. `src/mcp-server.test.ts`
     * drives it over stdio, but anything written beside the server was invisible to the suite,
     * because the glob stopped at `src` and `scripts`.
     */
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'mcp/**/*.test.ts', 'wasm/**/*.test.ts'],
    exclude: [
      // Monorepo AGS surfaces — need @tmrxjd/governance-engine.
      //
      // sdk-graph, debug-graph, coverage and save-graph were excluded here too,
      // under the same comment. They do not need the engine — all 24 of their
      // tests pass standalone — and while they were skipped nothing enforced
      // the coverage inventories, which is how 269 seeded `unmodeled` rows sat
      // untouched for four days without a single failing test. Re-enabled
      // 2026-08-18 with the oracle merged into the graph.
      'src/mechanics/doctor/**',
      'src/mechanics/kernel/**',
      'src/mechanics/sandbox/**',
      'src/mechanics/registry/**',
      'src/mechanics/lsp/**',
      'src/mechanics/docs-gen/**',
      'src/mechanics/builders/builders.test.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],
    environment: 'node',
  },
})
