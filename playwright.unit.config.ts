import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/helpers/**/*.spec.ts', 'tests/helpers/**/*.spec.mjs', 'playwright/**/*.spec.ts'],
  reporter: 'list'
})
