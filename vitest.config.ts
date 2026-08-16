import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      // Monorepo AGS surfaces — need @tmrxjd/governance-engine / unfinished trust seed
      'src/mechanics/doctor/**',
      'src/mechanics/kernel/**',
      'src/mechanics/sandbox/**',
      'src/mechanics/registry/**',
      'src/mechanics/lsp/**',
      'src/mechanics/docs-gen/**',
      'src/mechanics/sdk-graph/**/*.test.ts',
      'src/mechanics/debug-graph/**/*.test.ts',
      'src/mechanics/coverage/**/*.test.ts',
      'src/mechanics/save-graph/**/*.test.ts',
      'src/mechanics/builders/builders.test.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],
    environment: 'node',
  },
})
