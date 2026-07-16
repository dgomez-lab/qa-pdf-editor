import { test, expect, type Page } from '@playwright/test'
import { ensureMvpsMarketingUrl, gotoMarketingPath } from './mvpsUrl'

const environmentKeys = [
  'APPEND_QA_TOKEN',
  'BASE_URL',
  'QAI_TOKEN_PARAM'
] as const

type EnvironmentKey = (typeof environmentKeys)[number]

test.describe('MVPS marketing URLs', () => {
  const originalEnvironment = new Map<EnvironmentKey, string | undefined>()

  test.beforeEach(() => {
    for (const key of environmentKeys) {
      originalEnvironment.set(key, process.env[key])
      delete process.env[key]
    }
  })

  test.afterEach(() => {
    for (const key of environmentKeys) {
      const value = originalEnvironment.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  test('resolves a relative path before appending the MVPS QA token', async () => {
    process.env.BASE_URL = 'https://red3.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=test-token'
    const calls: Array<{ url: string; options: unknown }> = []
    const options = { waitUntil: 'domcontentloaded' } as const
    const page = {
      goto: async (url: string, receivedOptions: unknown) => {
        calls.push({ url, options: receivedOptions })
        return null
      }
    } as unknown as Page

    await gotoMarketingPath(page, '/forms', options)

    expect(calls).toEqual([
      {
        url: 'https://red3.mvps.website/forms?x-token-qa=test-token',
        options
      }
    ])
  })

  test('preserves an existing query when appending the QA token', async () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=test token'
    let navigatedUrl = ''
    const page = {
      goto: async (url: string) => {
        navigatedUrl = url
        return null
      }
    } as unknown as Page

    await gotoMarketingPath(page, 'forms?ip=US')

    expect(navigatedUrl).toBe(
      'https://red.mvps.website/forms?ip=US&x-token-qa=test%20token'
    )
  })

  test('does not duplicate an existing QA token', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=replacement'
    const target =
      'https://red.mvps.website/contact?x-token-qa=existing-token'

    expect(ensureMvpsMarketingUrl(target)).toBe(target)
  })

  test('does not append the MVPS token to an external absolute URL', () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=test-token'
    const target = 'https://example.com/forms?ip=US'

    expect(ensureMvpsMarketingUrl(target)).toBe(target)
  })

  test('honors the QA token opt-out flag', async () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=test-token'
    process.env.APPEND_QA_TOKEN = 'false'
    let navigatedUrl = ''
    const page = {
      goto: async (url: string) => {
        navigatedUrl = url
        return null
      }
    } as unknown as Page

    await gotoMarketingPath(page, '/about-us')

    expect(navigatedUrl).toBe('https://red.mvps.website/about-us')
  })
})
