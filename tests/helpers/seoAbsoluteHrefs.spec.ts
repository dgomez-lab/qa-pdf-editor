import { test, expect, type Page } from '@playwright/test'
import {
  collectFooterAbsoluteHrefErrors,
  collectFormsPageAbsoluteHrefErrors,
  collectHeaderAbsoluteHrefErrors,
  collectLandingAbsoluteHrefErrors,
  FORMS_PAGE_LINK_CHECKS
} from './seoAbsoluteHrefs'

const envKeys = ['BASE_URL', 'CI'] as const
let savedEnv: Record<(typeof envKeys)[number], string | undefined>
let htmlPageCounter = 0

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

async function openHtml(page: Page, body: string, origin = 'https://example.test'): Promise<void> {
  const url = `${origin}/unit-${htmlPageCounter++}`
  await page.route(url, async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body
    })
  })
  await page.goto(url)
}

test.describe('seoAbsoluteHrefs', () => {
  test('header checks reject relative links under the strict policy', async ({ page }) => {
    process.env.BASE_URL = 'https://example.test'
    await openHtml(
      page,
      `
        <a data-id="mostUsedForm" href="/forms">Forms</a>
        <a data-id="logIn" href="https://example.test/login/">Log in</a>
      `
    )

    const errors = await collectHeaderAbsoluteHrefErrors(page)

    expect(errors).toEqual(['mostUsedForm: href must be absolute http(s), got: /forms'])
  })

  test('header checks accept relative links under the relaxed policy', async ({ page }) => {
    process.env.BASE_URL = 'https://example.test'
    await openHtml(
      page,
      `
        <a data-id="mostUsedForm" href="/forms/">Forms</a>
        <a data-id="logIn" href="/login">Log in</a>
      `
    )

    const errors = await collectHeaderAbsoluteHrefErrors(page, undefined, { hrefPolicy: 'relaxedPath' })

    expect(errors).toEqual([])
  })

  test('landing checks fall back to main content and resolve relative paths', async ({ page }) => {
    process.env.BASE_URL = 'https://example.test'
    await openHtml(
      page,
      `
        <main>
          <a href="/lp/edit-pdf/">Edit PDF</a>
        </main>
      `
    )

    const errors = await collectLandingAbsoluteHrefErrors(page, ['/lp/edit-pdf'], {
      hrefPolicy: 'relaxedPath',
      contentRoot: 'auto'
    })

    expect(errors).toEqual([])
  })

  test('footer checks accept footerLogo aliases and normalized trailing slashes', async ({ page }) => {
    process.env.BASE_URL = 'https://example.test'
    await openHtml(
      page,
      `
        <footer class="FooterContainer">
          <a data-id="footerLogo" href="https://example.test/">Home</a>
          <a href="https://example.test/contact/">Contact</a>
        </footer>
      `
    )

    const errors = await collectFooterAbsoluteHrefErrors(page, ['/contact'])

    expect(errors).toEqual([])
  })

  test('forms checks match generated selectors and absolute pathnames', async ({ page }) => {
    process.env.BASE_URL = 'https://example.test'
    const links = FORMS_PAGE_LINK_CHECKS.map(
      ({ dataId, pathname }) => `<a data-id="${dataId}" href="https://example.test${pathname}/">${dataId}</a>`
    ).join('')
    await openHtml(page, links)

    const errors = await collectFormsPageAbsoluteHrefErrors(page)

    expect(errors).toEqual([])
  })

  test('MVPS header checks retry after a failed first pass', async ({ page }) => {
    process.env.BASE_URL = 'https://red.mvps.website'
    let requestCount = 0
    await page.route('https://red.mvps.website/mvps-unit', async (route) => {
      requestCount += 1
      const loginHref =
        requestCount === 1 ? 'https://red.mvps.website/sign-in' : 'https://red.mvps.website/login'
      await route.fulfill({
        contentType: 'text/html',
        body: `
          <a data-id="mostUsedForm" href="https://red.mvps.website/forms">Forms</a>
          <a data-id="logIn" href="${loginHref}">Log in</a>
        `
      })
    })
    await page.goto('https://red.mvps.website/mvps-unit')

    const errors = await collectHeaderAbsoluteHrefErrors(page)

    expect(errors).toEqual([])
    expect(requestCount).toBe(2)
  })
})
