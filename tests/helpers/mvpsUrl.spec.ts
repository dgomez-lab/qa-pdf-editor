import { test, expect } from '@playwright/test'
import { ensureMvpsMarketingUrl, gotoMarketingPath } from './mvpsUrl'

type EnvSnapshot = Partial<Record<'BASE_URL' | 'APPEND_QA_TOKEN' | 'QAI_TOKEN_PARAM', string>>

function captureEnv(): EnvSnapshot {
  return {
    BASE_URL: process.env.BASE_URL,
    APPEND_QA_TOKEN: process.env.APPEND_QA_TOKEN,
    QAI_TOKEN_PARAM: process.env.QAI_TOKEN_PARAM
  }
}

function restoreEnv(snapshot: EnvSnapshot): void {
  for (const key of Object.keys(snapshot) as Array<keyof EnvSnapshot>) {
    const value = snapshot[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

test.describe('MVPS marketing URLs', () => {
  let envSnapshot: EnvSnapshot

  test.afterEach(() => {
    restoreEnv(envSnapshot)
  })

  test.beforeEach(() => {
    envSnapshot = captureEnv()
    delete process.env.APPEND_QA_TOKEN
    delete process.env.QAI_TOKEN_PARAM
  })

  test('appends the QA token to MVPS relative paths without dropping existing query params', () => {
    process.env.BASE_URL = 'https://red.mvps.website'

    expect(ensureMvpsMarketingUrl('/forms?utm_source=seo')).toBe(
      '/forms?utm_source=seo&x-token-qa=niGqCYH7McqERAB'
    )
  })

  test('keeps non-MVPS URLs unchanged and honors the disable flag', () => {
    process.env.BASE_URL = 'https://staging.pdfhint.com'
    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')

    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.APPEND_QA_TOKEN = 'false'
    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')
  })

  test('resolves marketing navigation targets against BASE_URL and preserves custom token values', async () => {
    process.env.BASE_URL = 'https://red3.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=token value'
    const navigations: string[] = []

    await gotoMarketingPath(
      {
        goto: async (url: string) => {
          navigations.push(url)
          return null
        }
      } as unknown as Parameters<typeof gotoMarketingPath>[0],
      'downloads'
    )

    expect(navigations).toEqual([
      'https://red3.mvps.website/downloads?x-token-qa=token+value'
    ])
  })
})
