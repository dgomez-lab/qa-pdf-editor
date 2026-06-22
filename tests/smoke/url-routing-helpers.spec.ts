import { test, expect } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'
import { ensureMvpsMarketingUrl } from '../helpers/mvpsUrl'

const ENV_KEYS = [
  'APP',
  'APPEND_QA_TOKEN',
  'BASE_URL',
  'ENVIRONMENT',
  'GITHUB_ACTIONS',
  'MVPS_SLOT',
  'PDFHINT_BASE_URL',
  'PLAYWRIGHT_APP',
  'QAI_TOKEN_PARAM'
] as const

type EnvKey = (typeof ENV_KEYS)[number]
type EnvSnapshot = Partial<Record<EnvKey, string>>

function snapshotEnv(): EnvSnapshot {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as EnvSnapshot
}

function restoreEnv(snapshot: EnvSnapshot): void {
  for (const key of ENV_KEYS) {
    const value = snapshot[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function clearEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key]
}

test.describe('Smoke - URL routing helpers', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test.describe.configure({ mode: 'serial' })

  let envSnapshot: EnvSnapshot

  test.beforeEach(() => {
    envSnapshot = snapshotEnv()
    clearEnv()
  })

  test.afterEach(() => {
    restoreEnv(envSnapshot)
  })

  test('defaults to pdfhint outside GitHub Actions when app vars are blank', () => {
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = ''

    expect(resolvePlaywrightBaseUrl()).toBe('https://staging.pdfhint.com')
  })

  test('defaults to mergedpdf in GitHub Actions when app vars are blank', () => {
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = ''
    process.env.GITHUB_ACTIONS = 'true'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
  })

  test('uses PLAYWRIGHT_APP when APP is blank', () => {
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = 'mergedpdf'
    process.env.MVPS_SLOT = '3'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red3.mvps.website')
  })

  test('moves explicit MVPS base URL query into QAI_TOKEN_PARAM', () => {
    process.env.BASE_URL = 'red2.mvps.website/?x-token-qa=from-base'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-base')
  })

  test('preserves an existing QAI_TOKEN_PARAM over explicit MVPS base URL query', () => {
    process.env.BASE_URL = 'https://red.mvps.website/?x-token-qa=from-base'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=from-secret'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-secret')
  })

  test('adds the configured QA token key to MVPS relative paths', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'qa-token=abc123'

    expect(ensureMvpsMarketingUrl('/forms?utm_source=ci')).toBe(
      '/forms?utm_source=ci&qa-token=abc123'
    )
  })

  test('does not duplicate configured QA token keys on MVPS URLs', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'qa-token=abc123'

    expect(ensureMvpsMarketingUrl('/forms?qa-token=abc123')).toBe('/forms?qa-token=abc123')
    expect(ensureMvpsMarketingUrl('https://red.mvps.website/forms?qa-token=abc123')).toBe(
      'https://red.mvps.website/forms?qa-token=abc123'
    )
  })

  test('keeps non-MVPS URLs and disabled MVPS token appends unchanged', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'qa-token=abc123'

    expect(ensureMvpsMarketingUrl('https://example.com/forms')).toBe('https://example.com/forms')

    process.env.APPEND_QA_TOKEN = 'false'

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')
  })
})
