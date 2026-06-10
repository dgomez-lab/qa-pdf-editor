import { test, expect, type Page } from '@playwright/test'
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

function restoreEnv(saved: Record<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function resetEnv(): Record<EnvKey, string | undefined> {
  const saved = {} as Record<EnvKey, string | undefined>
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  return saved
}

test.describe('mvpsUrl', () => {
  test('appends the default QA token to relative MVPS marketing paths', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website'

      expect(ensureMvpsMarketingUrl('/login')).toBe('/login?x-token-qa=niGqCYH7McqERAB')
      expect(ensureMvpsMarketingUrl('/forms?locale=en')).toBe('/forms?locale=en&x-token-qa=niGqCYH7McqERAB')
    } finally {
      restoreEnv(saved)
    }
  })

  test('appends a custom QA token to absolute MVPS URLs', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website'
      process.env.QAI_TOKEN_PARAM = 'qa-access=custom token'

      expect(ensureMvpsMarketingUrl('https://red.mvps.website/forms')).toBe(
        'https://red.mvps.website/forms?qa-access=custom+token'
      )
    } finally {
      restoreEnv(saved)
    }
  })

  test('leaves URLs unchanged outside MVPS or when token appending is disabled', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://staging.pdfhint.com'
      expect(ensureMvpsMarketingUrl('/login')).toBe('/login')

      process.env.BASE_URL = 'https://red.mvps.website'
      process.env.APPEND_QA_TOKEN = 'false'
      expect(ensureMvpsMarketingUrl('/login')).toBe('/login')
    } finally {
      restoreEnv(saved)
    }
  })

  test('does not duplicate an existing x-token-qa parameter', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website'

      expect(ensureMvpsMarketingUrl('/login?x-token-qa=provided')).toBe('/login?x-token-qa=provided')
    } finally {
      restoreEnv(saved)
    }
  })

  test('resolves marketing navigation against BASE_URL and preserves tokens from an explicit MVPS URL', async () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website?x-token-qa=from-base'
      let navigatedTo = ''
      const page = {
        goto: async (url: string) => {
          navigatedTo = url
          return null
        }
      } as unknown as Page

      await gotoMarketingPath(page, '/forms')

      expect(navigatedTo).toBe('https://red.mvps.website/forms?x-token-qa=from-base')
      expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-base')
    } finally {
      restoreEnv(saved)
    }
  })
})
