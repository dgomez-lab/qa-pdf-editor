import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/helpers/**/*.spec.ts', 'playwright/**/*.spec.ts'],
  reporter: 'list'
})
