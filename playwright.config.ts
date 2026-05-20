import * as fs from 'node:fs'
import * as path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig, cucumberReporter } from 'playwright-bdd'
import { isConfigurationJsonEnvKey, loadConfiguration } from './playwright/loadConfiguration'
import { resolvePlaywrightBaseUrl } from './playwright/resolveBaseUrl'

/**
 * Carga `.env` y `.env.local` (en ese orden) en `process.env` antes de
 * construir la config. UI Mode (`playwright test --ui`) usa esto para que las
 * env vars (secretos, PLAYWRIGHT_PAYMENT_SMOKE, etc.) estén siempre
 * disponibles aunque el shell que lanzó el watcher no las haya exportado.
 */
function loadEnvFile(filename: string): void {
  const file = path.join(__dirname, filename)
  if (!fs.existsSync(file)) return
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (isConfigurationJsonEnvKey(key)) continue
    if (process.env[key] !== undefined) continue
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}
loadEnvFile('.env')
loadEnvFile('.env.local')
loadConfiguration()

if (process.argv.includes('--headed')) {
  console.warn(
    '[qa-pdf-editor] --headed en la CLI fuerza navegador visible; driver.headless en config/configuration.json se ignora. Quita --headed para usar solo el JSON.'
  )
}

const baseURL = resolvePlaywrightBaseUrl()
if (!process.env.BASE_URL?.trim()) {
  process.env.BASE_URL = baseURL
}

/**
 * Equivalente a `driver.headless` en `config/configuration.json` (legacy `qai-pa-pdf-editor`).
 * `HEADLESS=0` / `false` / `no` / `off` → navegador visible (paridad con `--headed`).
 */
function resolveHeadless(): boolean {
  const v = process.env.HEADLESS?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  return true
}

/**
 * Equivalente a `driver.driverNativeLogs` / "step waiter" del legacy: ralentiza cada
 * acción de Playwright en `SLOWMO` ms para depurar visualmente. `SLOWMO=250` ≈ 250 ms.
 */
function resolveSlowMo(): number {
  const v = Number(process.env.SLOWMO ?? '0')
  return Number.isFinite(v) && v >= 0 ? v : 0
}

const bddTestDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['tests/bdd/fixtures.ts', 'tests/bdd/steps/**/*.ts'],
  outputDir: '.features-gen'
})

const reporters: Parameters<typeof defineConfig>[0]['reporter'] = [
  ['list'],
  cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
  ['html', { open: 'never' }]
]

const terminalStepsOff =
  process.env.BDD_TERMINAL_STEPS === '0' ||
  process.env.BDD_TERMINAL_STEPS?.toLowerCase() === 'false'
const terminalStepsOn =
  !terminalStepsOff && (process.env.BDD_TERMINAL_STEPS === '1' || !process.env.CI)

if (terminalStepsOn) {
  reporters.splice(
    1,
    0,
    cucumberReporter('./tests/bdd/reporters/terminalStepsFormatter.ts') as (typeof reporters)[number]
  )
}

export default defineConfig({
  testDir: bddTestDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 180_000,
  snapshotDir: path.join(__dirname, 'tests', 'visual', 'baseline'),
  snapshotPathTemplate: '{snapshotDir}/{arg}{-projectName}{-snapshotSuffix}{ext}',
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      maxDiffPixels: 2500,
      animations: 'disabled',
      scale: 'css'
    }
  },
  reporter: reporters,
  use: {
    baseURL,
    headless: resolveHeadless(),
    launchOptions: { slowMo: resolveSlowMo() },
    /**
     * UI Mode necesita trace para popular Actions/Network/Console/Source.
     * - `PLAYWRIGHT_TRACE=1` → siempre 'on'.
     * - Si Playwright detecta UI Mode (PWTEST_TEST_UI_MODE=1) → 'on'.
     * - En CI / CLI normal mantenemos 'on-first-retry' para no engordar artifacts.
     */
    trace:
      process.env.PLAYWRIGHT_TRACE === '1' || process.env.PWTEST_TEST_UI_MODE === '1'
        ? 'on'
        : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 90_000,
    actionTimeout: 45_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
