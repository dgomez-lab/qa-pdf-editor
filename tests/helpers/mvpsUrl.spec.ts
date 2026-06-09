import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { ensureMvpsMarketingUrl, gotoMarketingPath } from './mvpsUrl'

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

function saveEnv(): Record<EnvKey, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
    EnvKey,
    string | undefined
  >
}

function restoreEnv(saved: Record<EnvKey, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

test.describe('mvpsUrl', () => {
  let savedEnv: Record<EnvKey, string | undefined>

  test.beforeEach(() => {
    savedEnv = saveEnv()
    for (const key of ENV_KEYS) {
      delete process.env[key]
    }
  })

  test.afterEach(() => {
    restoreEnv(savedEnv)
  })

  test('adds the default QA token to MVPS relative marketing paths', () => {
    process.env.BASE_URL = 'https://red.mvps.website'

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms?x-token-qa=niGqCYH7McqERAB')
    expect(ensureMvpsMarketingUrl('/forms?utm_source=qa')).toBe(
      '/forms?utm_source=qa&x-token-qa=niGqCYH7McqERAB'
    )
  })

  test('does not add a token outside MVPS or when token appending is disabled', () => {
    process.env.BASE_URL = 'https://staging.pdfhint.com'
    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')

    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.APPEND_QA_TOKEN = 'false'
    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')
  })

  test('preserves existing MVPS tokens and does not rewrite external absolute URLs', () => {
    process.env.BASE_URL = 'https://red.mvps.website'

    expect(ensureMvpsMarketingUrl('/forms?x-token-qa=already-set')).toBe(
      '/forms?x-token-qa=already-set'
    )
    expect(ensureMvpsMarketingUrl('https://staging.pdfhint.com/forms')).toBe(
      'https://staging.pdfhint.com/forms'
    )
  })

  test('adds custom token parameters to absolute MVPS URLs without dropping existing query params', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'qa-access=abc 123'

    expect(ensureMvpsMarketingUrl('https://red.mvps.website/forms?utm_source=ci')).toBe(
      'https://red.mvps.website/forms?utm_source=ci&qa-access=abc+123'
    )
  })

  test('gotoMarketingPath resolves relative paths against BASE_URL and preserves token query from it', async () => {
    process.env.BASE_URL = 'https://red3.mvps.website?x-token-qa=from-base'
    const calls: { target: string; options: unknown }[] = []
    const page = {
      goto: async (target: string, options: unknown) => {
        calls.push({ target, options })
        return null
      }
    } as unknown as Page

    await gotoMarketingPath(page, 'forms', { waitUntil: 'domcontentloaded' })

    expect(calls).toEqual([
      {
        target: 'https://red3.mvps.website/forms?x-token-qa=from-base',
        options: { waitUntil: 'domcontentloaded' }
      }
    ])
  })
})
