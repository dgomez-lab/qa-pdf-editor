import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { loadConfiguration } from './loadConfiguration'

const ENV_KEYS = [
  'APP',
  'APPEND_QA_TOKEN',
  'BASE_URL',
  'BDD_LOG_LEVEL',
  'EMAIL_SUBJECT_BRAND_PREFIX',
  'ENVIRONMENT',
  'HEADLESS',
  'QA_CONFIGURATION_FILE',
  'QA_CONFIGURATION_LOADED',
  'SLOWMO'
] as const

type EnvKey = (typeof ENV_KEYS)[number]

function saveEnv(): Record<EnvKey, string | undefined> {
  const saved = {} as Record<EnvKey, string | undefined>
  for (const key of ENV_KEYS) saved[key] = process.env[key]
  return saved
}

function restoreEnv(saved: Record<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function writeConfig(config: unknown): { dir: string; configPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-config-'))
  const configPath = path.join(dir, 'configuration.json')
  fs.writeFileSync(configPath, JSON.stringify(config))
  return { dir, configPath }
}

test.describe('loadConfiguration', () => {
  test('maps headless from JSON even when HEADLESS already set (e.g. from .env)', () => {
    const saved = saveEnv()
    const { dir, configPath } = writeConfig({
      driver: { headless: true },
      projectVars: { environment: 'red', app: 'mergedpdf' }
    })
    try {
      process.env.HEADLESS = '0'

      loadConfiguration(configPath)

      expect(process.env.HEADLESS).toBe('1')
    } finally {
      restoreEnv(saved)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('maps headless and environment without overriding existing env', () => {
    const saved = saveEnv()
    const { dir, configPath } = writeConfig({
      driver: { headless: false },
      logLevel: 'INFO',
      projectVars: { environment: 'red3', app: 'mergedpdf' }
    })
    try {
      delete process.env.HEADLESS
      delete process.env.ENVIRONMENT
      delete process.env.APP

      loadConfiguration(configPath)

      expect(process.env.HEADLESS).toBe('0')
      expect(process.env.ENVIRONMENT).toBe('red3')
      expect(process.env.APP).toBe('mergedpdf')
      expect(process.env.BDD_LOG_LEVEL).toBe('INFO')
    } finally {
      restoreEnv(saved)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('maps pdfhint baseUrl and appendQaToken', () => {
    const saved = saveEnv()
    const { dir, configPath } = writeConfig({
      projectVars: {
        baseUrl: 'https://staging.pdfhint.com',
        app: 'pdfhint',
        appendQaToken: false,
        emailSubjectBrandPrefix: 'pdfhint'
      }
    })
    try {
      for (const key of ENV_KEYS) delete process.env[key]

      loadConfiguration(configPath)

      expect(process.env.BASE_URL).toBe('https://staging.pdfhint.com')
      expect(process.env.APP).toBe('pdfhint')
      expect(process.env.APPEND_QA_TOKEN).toBe('false')
      expect(process.env.EMAIL_SUBJECT_BRAND_PREFIX).toBe('pdfhint')
    } finally {
      restoreEnv(saved)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('maps stepWaiter seconds to SLOWMO milliseconds and normalizes log level', () => {
    const saved = saveEnv()
    const { dir, configPath } = writeConfig({
      logLevel: 'debug',
      timeouts: { stepWaiter: 0.5 }
    })
    try {
      delete process.env.SLOWMO
      delete process.env.BDD_LOG_LEVEL

      loadConfiguration(configPath)

      expect(process.env.SLOWMO).toBe('500')
      expect(process.env.BDD_LOG_LEVEL).toBe('DEBUG')
    } finally {
      restoreEnv(saved)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('empty baseUrl clears stale BASE_URL from the environment', () => {
    const saved = saveEnv()
    const { dir, configPath } = writeConfig({
      projectVars: { baseUrl: '' }
    })
    try {
      process.env.BASE_URL = 'https://stale.example.test'

      loadConfiguration(configPath)

      expect(process.env.BASE_URL).toBeUndefined()
    } finally {
      restoreEnv(saved)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('environment without app selects mergedpdf and appendQaToken true clears a disabled flag', () => {
    const saved = saveEnv()
    const { dir, configPath } = writeConfig({
      projectVars: {
        environment: 'red2',
        appendQaToken: true
      }
    })
    try {
      process.env.APP = 'pdfhint'
      process.env.APPEND_QA_TOKEN = 'false'

      loadConfiguration(configPath)

      expect(process.env.ENVIRONMENT).toBe('red2')
      expect(process.env.APP).toBe('mergedpdf')
      expect(process.env.APPEND_QA_TOKEN).toBeUndefined()
    } finally {
      restoreEnv(saved)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
