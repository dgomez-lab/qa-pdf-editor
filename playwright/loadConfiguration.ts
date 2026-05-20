import * as fs from 'node:fs'
import * as path from 'node:path'

export type LocalConfiguration = {
  driver?: {
    headless?: boolean
    driverNativeLogs?: boolean
  }
  logLevel?: string
  timeouts?: {
    cucumberPromisesTimeout?: number
    waiter?: number
    qualityWaiter?: number
    scrollWaiter?: number
    selectWaiter?: number
    stepWaiter?: number
  }
  projectVars?: {
    environment?: string
    baseUrl?: string
    app?: string
    appendQaToken?: boolean
    emailSubjectBrandPrefix?: string
  }
}

/**
 * Solo se leen desde `config/configuration.json`, nunca desde `.env`.
 * `.env` queda para secretos (CRM, Mailpit) y flags puntuales (`PLAYWRIGHT_PAYMENT_SMOKE`).
 */
export const CONFIGURATION_JSON_ENV_KEYS = new Set([
  'HEADLESS',
  'ENVIRONMENT',
  'MVPS_SLOT',
  'APP',
  'PLAYWRIGHT_APP',
  'BASE_URL',
  'PDFHINT_BASE_URL',
  'BDD_LOG_LEVEL',
  'SLOWMO',
  'APPEND_QA_TOKEN',
  'EMAIL_SUBJECT_BRAND_PREFIX'
])

export function isConfigurationJsonEnvKey(key: string): boolean {
  return CONFIGURATION_JSON_ENV_KEYS.has(key)
}

export function resolveConfigurationPath(): string {
  const fromEnv = process.env.QAI_PA_CONFIGURATION_PATH?.trim()
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv)
  }
  return path.join(process.cwd(), 'config', 'configuration.json')
}

export function readLocalConfiguration(filePath?: string): LocalConfiguration {
  const resolved = filePath ?? resolveConfigurationPath()
  if (!fs.existsSync(resolved)) return {}
  const raw = fs.readFileSync(resolved, 'utf8')
  return JSON.parse(raw) as LocalConfiguration
}

/**
 * Aplica `config/configuration.json` (o `QAI_PA_CONFIGURATION_PATH`) a `process.env`.
 * Es la única fuente para headless, entorno MVPS, app y URL (`.env` no puede definirlos).
 *
 * Paridad con `qai-pa-pdf-editor` (`DogLocalConfiguration` + `projectVars`).
 */
export function loadConfiguration(filePath?: string): LocalConfiguration {
  const config = readLocalConfiguration(filePath)
  const driver = config.driver
  const projectVars = config.projectVars
  const timeouts = config.timeouts

  if (driver?.headless !== undefined) {
    process.env.HEADLESS = driver.headless ? '1' : '0'
  }

  if (config.logLevel?.trim()) {
    process.env.BDD_LOG_LEVEL = config.logLevel.trim().toUpperCase()
  }

  if (timeouts?.stepWaiter != null) {
    const ms = Math.round(Number(timeouts.stepWaiter) * 1000)
    if (Number.isFinite(ms) && ms >= 0) process.env.SLOWMO = String(ms)
  }

  if (projectVars?.environment?.trim()) {
    process.env.ENVIRONMENT = projectVars.environment.trim().toLowerCase()
  }

  const baseUrl = projectVars?.baseUrl?.trim()
  if (baseUrl) {
    process.env.BASE_URL = baseUrl
  } else if (projectVars && 'baseUrl' in projectVars) {
    delete process.env.BASE_URL
  }

  const app = projectVars?.app?.trim().toLowerCase()
  if (app) {
    process.env.APP = app
  } else if (projectVars?.environment?.trim()) {
    process.env.APP = 'mergedpdf'
  }

  if (projectVars?.appendQaToken === false) {
    process.env.APPEND_QA_TOKEN = 'false'
  } else if (projectVars?.appendQaToken === true) {
    delete process.env.APPEND_QA_TOKEN
  }

  if (projectVars?.emailSubjectBrandPrefix?.trim()) {
    process.env.EMAIL_SUBJECT_BRAND_PREFIX = projectVars.emailSubjectBrandPrefix.trim()
  }

  if (process.env.QA_CONFIGURATION_LOADED !== '1') {
    process.env.QA_CONFIGURATION_FILE = filePath ?? resolveConfigurationPath()
    process.env.QA_CONFIGURATION_LOADED = '1'
  }

  return config
}
