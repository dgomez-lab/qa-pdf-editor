import { test, expect, type Locator, type Page } from '@playwright/test'
import { openHome } from './navigation'

const ENV_KEYS = ['APPEND_QA_TOKEN', 'BASE_URL', 'CI', 'QAI_TOKEN_PARAM'] as const

type EnvKey = (typeof ENV_KEYS)[number]

function createPageHarness(firstNavigationReady = true): {
  page: Page
  gotoTargets: string[]
  waitForFunctionCalls: () => number
} {
  const gotoTargets: string[] = []
  let waitForFunctionCallCount = 0

  const locator = {
    first() {
      return locator
    },
    async isVisible() {
      return false
    },
    async click() {},
    async waitFor() {
      if (!firstNavigationReady && gotoTargets.length === 1) {
        throw new Error('home markers unavailable')
      }
    }
  } as unknown as Locator

  const page = {
    async goto(target: string) {
      gotoTargets.push(target)
      return null
    },
    locator() {
      return locator
    },
    getByRole() {
      return locator
    },
    async waitForTimeout() {},
    async waitForLoadState() {},
    async waitForFunction() {
      waitForFunctionCallCount += 1
    }
  } as unknown as Page

  return {
    page,
    gotoTargets,
    waitForFunctionCalls: () => waitForFunctionCallCount
  }
}

test.describe('openHome', () => {
  test.describe.configure({ mode: 'serial' })

  let savedEnv: Record<EnvKey, string | undefined>

  test.beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
      EnvKey,
      string | undefined
    >
    for (const key of ENV_KEYS) delete process.env[key]
  })

  test.afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = savedEnv[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  test('waits for MVPS header hydration before accepting home readiness', async () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=test-token'
    const harness = createPageHarness()

    await openHome(harness.page)

    expect(harness.gotoTargets).toEqual(['https://red.mvps.website/?x-token-qa=test-token'])
    expect(harness.waitForFunctionCalls()).toBe(2)
  })

  test('retries home navigation once in CI when initial readiness checks fail', async () => {
    process.env.BASE_URL = 'https://staging.pdfhint.com'
    process.env.CI = 'true'
    const harness = createPageHarness(false)

    await openHome(harness.page)

    expect(harness.gotoTargets).toEqual([
      'https://staging.pdfhint.com/',
      'https://staging.pdfhint.com/'
    ])
    expect(harness.waitForFunctionCalls()).toBe(0)
  })

  test('builds localized pdfhint paths with encoded query parameters', async () => {
    process.env.BASE_URL = 'https://staging.pdfhint.com'
    const harness = createPageHarness()

    await openHome(harness.page, {
      locale: ' ES ',
      query: { utm_source: 'ci suite', utm_medium: 'regression' }
    })

    expect(harness.gotoTargets).toEqual([
      'https://staging.pdfhint.com/es/?utm_source=ci+suite&utm_medium=regression'
    ])
  })
})
