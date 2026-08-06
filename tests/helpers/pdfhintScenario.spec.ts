import { expect, test } from '@playwright/test'
import {
  PDFHINT_STAGING_BASE_URL,
  activatePdfhintScenarioEnv,
  deactivatePdfhintScenarioEnv,
  isPdfhintScenario,
  setPdfhintScenarioActive
} from './pdfhintScenario'

const ENV_KEYS = [
  'BASE_URL',
  'APPEND_QA_TOKEN',
  'EMAIL_SUBJECT_BRAND_PREFIX',
  'APP',
  'SEO_LOGIN_PATHNAME'
] as const

function snapshotEnv(): Record<(typeof ENV_KEYS)[number], string | undefined> {
  const out = {} as Record<(typeof ENV_KEYS)[number], string | undefined>
  for (const key of ENV_KEYS) out[key] = process.env[key]
  return out
}

function restoreEnv(saved: Record<(typeof ENV_KEYS)[number], string | undefined>): void {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

test.describe('pdfhintScenario env activate/deactivate', () => {
  let saved: Record<(typeof ENV_KEYS)[number], string | undefined>

  test.beforeEach(() => {
    saved = snapshotEnv()
    deactivatePdfhintScenarioEnv()
    setPdfhintScenarioActive(false)
    for (const key of ENV_KEYS) delete process.env[key]
  })

  test.afterEach(() => {
    deactivatePdfhintScenarioEnv()
    setPdfhintScenarioActive(false)
    restoreEnv(saved)
  })

  test('activate sets staging pdfhint env and default login pathname', () => {
    activatePdfhintScenarioEnv()

    expect(isPdfhintScenario()).toBe(true)
    expect(process.env.BASE_URL).toBe(PDFHINT_STAGING_BASE_URL)
    expect(process.env.APPEND_QA_TOKEN).toBe('false')
    expect(process.env.EMAIL_SUBJECT_BRAND_PREFIX).toBe('pdfhint')
    expect(process.env.APP).toBe('pdfhint')
    expect(process.env.SEO_LOGIN_PATHNAME).toBe('/login')
  })

  test('activate preserves a trimmed SEO_LOGIN_PATHNAME override', () => {
    process.env.SEO_LOGIN_PATHNAME = '/es/login'
    activatePdfhintScenarioEnv()
    expect(process.env.SEO_LOGIN_PATHNAME).toBe('/es/login')
  })

  test('activate is idempotent and keeps the first saved snapshot', () => {
    process.env.BASE_URL = 'https://staging.pdfmerges.com'
    process.env.APP = 'mergedpdf'
    activatePdfhintScenarioEnv()
    process.env.BASE_URL = 'https://attacker.example'
    activatePdfhintScenarioEnv()
    expect(process.env.BASE_URL).toBe('https://attacker.example')

    deactivatePdfhintScenarioEnv()
    expect(isPdfhintScenario()).toBe(false)
    expect(process.env.BASE_URL).toBe('https://staging.pdfmerges.com')
    expect(process.env.APP).toBe('mergedpdf')
  })

  test('deactivate restores prior values and deletes keys that were unset', () => {
    process.env.BASE_URL = 'https://staging.pdfmerges.com'
    process.env.APPEND_QA_TOKEN = 'true'
    process.env.EMAIL_SUBJECT_BRAND_PREFIX = 'mergedpdf'
    process.env.APP = 'mergedpdf'
    process.env.SEO_LOGIN_PATHNAME = '/account/login'

    activatePdfhintScenarioEnv()
    deactivatePdfhintScenarioEnv()

    expect(isPdfhintScenario()).toBe(false)
    expect(process.env.BASE_URL).toBe('https://staging.pdfmerges.com')
    expect(process.env.APPEND_QA_TOKEN).toBe('true')
    expect(process.env.EMAIL_SUBJECT_BRAND_PREFIX).toBe('mergedpdf')
    expect(process.env.APP).toBe('mergedpdf')
    expect(process.env.SEO_LOGIN_PATHNAME).toBe('/account/login')
  })

  test('deactivate deletes keys that were absent before activate', () => {
    activatePdfhintScenarioEnv()
    expect(process.env.BASE_URL).toBe(PDFHINT_STAGING_BASE_URL)

    deactivatePdfhintScenarioEnv()

    expect(process.env.BASE_URL).toBeUndefined()
    expect(process.env.APPEND_QA_TOKEN).toBeUndefined()
    expect(process.env.EMAIL_SUBJECT_BRAND_PREFIX).toBeUndefined()
    expect(process.env.APP).toBeUndefined()
    expect(process.env.SEO_LOGIN_PATHNAME).toBeUndefined()
  })

  test('setPdfhintScenarioActive toggles the scenario flag without mutating env', () => {
    process.env.BASE_URL = 'https://staging.pdfmerges.com'
    setPdfhintScenarioActive(true)
    expect(isPdfhintScenario()).toBe(true)
    expect(process.env.BASE_URL).toBe('https://staging.pdfmerges.com')
    setPdfhintScenarioActive(false)
    expect(isPdfhintScenario()).toBe(false)
    expect(process.env.BASE_URL).toBe('https://staging.pdfmerges.com')
  })
})
