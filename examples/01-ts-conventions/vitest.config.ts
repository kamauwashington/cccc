import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // Booting PGlite the first time takes a few seconds on a cold machine.
    testTimeout: 30_000,
    // PGlite boots inside beforeAll, which is governed by hookTimeout and not
    // by testTimeout. The default is 10 seconds and a cold WASM boot under load
    // can pass it, which fails the run for no real reason. This is the opening
    // live demo, so it must not flake.
    hookTimeout: 60_000,
    // The default reporter prints one line per passing test. On a projector
    // that is noise, and in a Claude Code session it is context.
    reporters: process.env.CI ? ['dot'] : ['default'],
  },
});
