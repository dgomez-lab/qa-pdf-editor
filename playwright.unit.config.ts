import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: [
    'tests/helpers/**/*.spec.ts',
    'tests/bdd/**/*.spec.ts',
    'playwright/**/*.spec.ts',
    'scripts/**/*.spec.mjs'
  ],
  reporter: 'list'
})
