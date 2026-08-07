import { test, expect } from '@playwright/test'
import { collectFormsPageAbsoluteHrefErrors, FORMS_PAGE_LINK_CHECKS } from './seoAbsoluteHrefs'

test.describe('seoAbsoluteHrefs forms MVPS retry', () => {
  const envKeys = ['BASE_URL', 'CI'] as const
  let savedEnv: Record<(typeof envKeys)[number], string | undefined>

  test.beforeEach(() => {
    savedEnv = {
      BASE_URL: process.env.BASE_URL,
      CI: process.env.CI
    }
    delete process.env.CI
  })

  test.afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    }
  })

  test('retries forms href checks after a failed first MVPS pass', async ({ page }) => {
    process.env.BASE_URL = 'https://red.mvps.website'
    let requestCount = 0

    await page.route('https://red.mvps.website/forms-unit', async (route) => {
      requestCount += 1
      const links = FORMS_PAGE_LINK_CHECKS.map((check, index) => {
        const pathname = requestCount === 1 && index === 0 ? '/lp/wrong-form' : check.pathname
        return `<a data-id=${JSON.stringify(check.dataId)} href="https://red.mvps.website${pathname}">${check.dataId}</a>`
      }).join('\n')
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><html><body><main>${links}</main></body></html>`
      })
    })

    await page.goto('https://red.mvps.website/forms-unit')

    await expect(collectFormsPageAbsoluteHrefErrors(page)).resolves.toEqual([])
    expect(requestCount).toBe(2)
  })
})
