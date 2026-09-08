import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // The default reporter prints one line per passing test. On a projector
    // that is noise, and in a Claude Code session it is context.
    reporters: process.env.CI ? ['dot'] : ['default'],
  },
});
