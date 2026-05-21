import { test, expect, type Page } from '@playwright/test'
import { ensureMvpsMarketingUrl, gotoMarketingPath } from './mvpsUrl'

const ENV_KEYS = [
  'APP',
  'PLAYWRIGHT_APP',
  'BASE_URL',
  'APPEND_QA_TOKEN',
  'QAI_TOKEN_PARAM',
  'MVPS_SLOT',
  'ENVIRONMENT',
  'GITHUB_ACTIONS',
  'PDFHINT_BASE_URL'
] as const

type EnvKey = (typeof ENV_KEYS)[number]

function saveEnv(): Record<EnvKey, string | undefined> {
  const saved = {} as Record<EnvKey, string | undefined>
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
  }
  return saved
}

function restoreEnv(saved: Record<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

async function resolvedGotoTarget(target: string): Promise<string> {
  let resolved = ''
  const page = {
    goto: async (url: string) => {
      resolved = url
      return null
    }
  } as unknown as Page

  await gotoMarketingPath(page, target)
  return resolved
}

test.describe('mvps marketing URL resolution', () => {
  let savedEnv: Record<EnvKey, string | undefined>

  test.beforeEach(() => {
    savedEnv = saveEnv()
    for (const key of ENV_KEYS) delete process.env[key]
  })

  test.afterEach(() => {
    restoreEnv(savedEnv)
  })

  test('resolves relative MVPS paths against BASE_URL and appends the QA token', async () => {
    process.env.BASE_URL = 'https://red3.mvps.website'
    process.env.APP = 'mergedpdf'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=token-123'

    await expect(resolvedGotoTarget('/forms?source=seo')).resolves.toBe(
      'https://red3.mvps.website/forms?source=seo&x-token-qa=token-123'
    )
  })

  test('uses the token from BASE_URL while stripping it from the resolved origin', async () => {
    process.env.BASE_URL = 'https://red8.mvps.website?x-token-qa=from-base'
    process.env.APP = 'mergedpdf'

    await expect(resolvedGotoTarget('login')).resolves.toBe(
      'https://red8.mvps.website/login?x-token-qa=from-base'
    )
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-base')
  })

  test('does not append the MVPS QA token when token appending is disabled', async () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.APP = 'mergedpdf'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=token-123'
    process.env.APPEND_QA_TOKEN = 'false'

    await expect(resolvedGotoTarget('/forms?source=seo')).resolves.toBe(
      'https://red.mvps.website/forms?source=seo'
    )
  })

  test('leaves absolute non-MVPS URLs unchanged in MVPS context', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.APP = 'mergedpdf'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=token-123'

    expect(ensureMvpsMarketingUrl('https://staging.pdfhint.com/forms?source=seo')).toBe(
      'https://staging.pdfhint.com/forms?source=seo'
    )
  })

  test('does not replace an existing MVPS QA token', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.APP = 'mergedpdf'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=new-token'

    expect(ensureMvpsMarketingUrl('https://red.mvps.website/forms?x-token-qa=existing')).toBe(
      'https://red.mvps.website/forms?x-token-qa=existing'
    )
  })
})
