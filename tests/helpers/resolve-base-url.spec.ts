import { test, expect } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'
import { ensureMvpsMarketingUrl } from './mvpsUrl'

const managedEnvKeys = [
  'APP',
  'PLAYWRIGHT_APP',
  'GITHUB_ACTIONS',
  'MVPS_SLOT',
  'ENVIRONMENT',
  'BASE_URL',
  'PDFHINT_BASE_URL',
  'QAI_TOKEN_PARAM',
  'APPEND_QA_TOKEN'
] as const

type ManagedEnvKey = (typeof managedEnvKeys)[number]

let originalEnv: Partial<Record<ManagedEnvKey, string>>

function snapshotManagedEnv(): Partial<Record<ManagedEnvKey, string>> {
  return Object.fromEntries(
    managedEnvKeys.map((key) => [key, process.env[key]])
  ) as Partial<Record<ManagedEnvKey, string>>
}

function restoreManagedEnv(snapshot: Partial<Record<ManagedEnvKey, string>>): void {
  for (const key of managedEnvKeys) {
    const value = snapshot[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function clearManagedEnv(): void {
  for (const key of managedEnvKeys) {
    delete process.env[key]
  }
}

test.describe.configure({ mode: 'serial' })

test.describe('Config helpers - base URL and MVPS QA token', { tag: ['@PDFEDITOR_CONFIG'] }, () => {
  test.beforeEach(() => {
    originalEnv = snapshotManagedEnv()
    clearManagedEnv()
  })

  test.afterEach(() => {
    restoreManagedEnv(originalEnv)
  })

  test('defaults GitHub Actions with empty app values to mergedpdf MVPS', async () => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = '   '

    expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
  })

  test('keeps local empty app values on pdfhint staging', async () => {
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = '   '

    expect(resolvePlaywrightBaseUrl()).toBe('https://staging.pdfhint.com')
  })

  test('normalizes explicit MVPS URLs and preserves the QA token for navigation', async () => {
    process.env.BASE_URL = 'red3.mvps.website/?x-token-qa=from-base-url'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red3.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-base-url')

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms?x-token-qa=from-base-url')
  })

  test('does not overwrite an existing QA token while normalizing explicit MVPS URLs', async () => {
    process.env.BASE_URL = 'https://red4.mvps.website/?x-token-qa=from-base-url'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=from-secret'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red4.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-secret')

    expect(ensureMvpsMarketingUrl('/forms?locale=en')).toBe('/forms?locale=en&x-token-qa=from-secret')
  })

  test('leaves non-MVPS and disabled QA-token navigation targets unchanged', async () => {
    process.env.BASE_URL = 'https://staging.pdfhint.com'

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')

    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.APPEND_QA_TOKEN = 'false'

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')
  })
})
