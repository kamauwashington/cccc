import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // Each test file boots its own Postgres. That is a WebAssembly module
    // compile, and five of them at once on a cold machine can take a while.
    // The default 5 second hook timeout is too tight for the first run.
    hookTimeout: 60000,
    testTimeout: 30000,
    // The default reporter prints one line per passing test. On a projector
    // that is noise, and in a Claude Code session it is context.
    reporters: process.env.CI ? ['dot'] : ['default'],
  },
});
