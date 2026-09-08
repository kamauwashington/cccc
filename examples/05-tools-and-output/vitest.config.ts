import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // Seeds the board once before any test file runs.
    globalSetup: ['tests/global-setup.ts'],
    // Every test spawns the CLI, and the CLI opens the same PGlite directory.
    // One file at a time keeps those opens from overlapping.
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 180000,
    // The default reporter prints one line per passing test. On a projector
    // that is noise, and in a Claude Code session it is context.
    reporters: process.env.CI ? ['dot'] : ['default'],
  },
});
