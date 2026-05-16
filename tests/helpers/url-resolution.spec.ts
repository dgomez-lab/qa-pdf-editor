import { test, expect } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'
import { appUrl, resolveAppBaseUrl } from './appUrl'
import { ensureMvpsMarketingUrl } from './mvpsUrl'

const ENV_KEYS = [
  'APP',
  'APPEND_QA_TOKEN',
  'BASE_URL',
  'ENVIRONMENT',
  'GITHUB_ACTIONS',
  'MVPS_SLOT',
  'PDFHINT_APP_BASE_URL',
  'PDFHINT_BASE_URL',
  'PLAYWRIGHT_APP',
  'QAI_TOKEN_PARAM'
] as const

type EnvKey = typeof ENV_KEYS[number]

const originalEnv = new Map<EnvKey, string | undefined>()

test.describe('URL resolution helpers', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    for (const key of ENV_KEYS) originalEnv.set(key, process.env[key])
  })

  test.beforeEach(() => {
    restoreEnv()
  })

  test.afterAll(() => {
    restoreEnv()
  })

  test('defaults empty CI app selection to mergedpdf MVPS origin', () => {
    setEnv({
      APP: '',
      BASE_URL: undefined,
      ENVIRONMENT: undefined,
      GITHUB_ACTIONS: 'true',
      MVPS_SLOT: '3',
      PLAYWRIGHT_APP: '',
      QAI_TOKEN_PARAM: undefined
    })

    expect(resolvePlaywrightBaseUrl()).toBe('https://red3.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBeUndefined()
  })

  test('strips an explicit MVPS query token from baseURL and reuses it for navigation', () => {
    setEnv({
      BASE_URL: 'https://red2.mvps.website/en/editor?x-token-qa=token123',
      QAI_TOKEN_PARAM: undefined
    })

    expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=token123')
    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms?x-token-qa=token123')
  })

  test('preserves an existing QA token when explicit MVPS baseURL also has one', () => {
    setEnv({
      BASE_URL: 'https://red4.mvps.website/?x-token-qa=from-base',
      QAI_TOKEN_PARAM: 'x-token-qa=from-env'
    })

    expect(resolvePlaywrightBaseUrl()).toBe('https://red4.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-env')
    expect(ensureMvpsMarketingUrl('/forms?utm_source=ci')).toBe('/forms?utm_source=ci&x-token-qa=from-env')
  })

  test('does not append QA tokens when the MVPS token flag is disabled', () => {
    setEnv({
      APPEND_QA_TOKEN: 'off',
      BASE_URL: 'https://red.mvps.website',
      QAI_TOKEN_PARAM: 'x-token-qa=token123'
    })

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')
  })

  test('keeps external absolute URLs unchanged when running against MVPS', () => {
    setEnv({
      BASE_URL: 'https://red.mvps.website',
      QAI_TOKEN_PARAM: 'x-token-qa=token123'
    })

    expect(ensureMvpsMarketingUrl('https://staging.pdfhint.com/forms')).toBe('https://staging.pdfhint.com/forms')
  })

  test('maps pdfhint marketing hosts to app hosts for authenticated routes', () => {
    setEnv({
      BASE_URL: 'https://staging.pdfhint.com/',
      PDFHINT_APP_BASE_URL: undefined
    })

    expect(resolveAppBaseUrl()).toBe('https://app.staging.pdfhint.com')
    expect(appUrl('dashboard')).toBe('https://app.staging.pdfhint.com/dashboard')
  })

  test('keeps authenticated routes relative outside pdfhint hosts', () => {
    setEnv({
      BASE_URL: 'https://red.mvps.website'
    })

    expect(appUrl('/dashboard')).toBe('/dashboard')
  })
})

function setEnv(values: Partial<Record<EnvKey, string | undefined>>): void {
  for (const [key, value] of Object.entries(values) as [EnvKey, string | undefined][]) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key)
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}
