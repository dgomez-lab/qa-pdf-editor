import { test, expect, type Page } from '@playwright/test'
import {
  collectFooterAbsoluteHrefErrors,
  collectFormsPageAbsoluteHrefErrors,
  collectHeaderAbsoluteHrefErrors,
  collectLandingAbsoluteHrefErrors,
  FORMS_PAGE_LINK_CHECKS
} from './seoAbsoluteHrefs'

async function loadHtml(page: Page, html: string): Promise<void> {
  await page.route('https://seo-helper.test/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: html })
  })
  await page.goto('https://seo-helper.test/')
}

test.describe('seoAbsoluteHrefs', () => {
  const savedBaseUrl = process.env.BASE_URL

  test.beforeEach(() => {
    process.env.BASE_URL = 'https://staging.pdfhint.com'
  })

  test.afterEach(async ({ page }) => {
    if (savedBaseUrl === undefined) delete process.env.BASE_URL
    else process.env.BASE_URL = savedBaseUrl
    await page.unroute('https://seo-helper.test/**').catch(() => {})
  })

  test('keeps strict header checks from accepting relative marketing hrefs', async ({ page }) => {
    await loadHtml(
      page,
      `
        <nav>
          <a data-id="mostUsedForm" href="/forms">Forms</a>
          <a data-id="logIn" href="https://seo-helper.test/login/">Login</a>
        </nav>
      `
    )

    await expect(
      collectHeaderAbsoluteHrefErrors(page, [
        { dataId: 'mostUsedForm', pathname: '/forms' },
        { dataId: 'logIn', pathname: '/login' }
      ])
    ).resolves.toEqual(['mostUsedForm: href must be absolute http(s), got: /forms'])
  })

  test('allows relaxed header checks to resolve relative links by pathname', async ({ page }) => {
    await loadHtml(
      page,
      `
        <nav>
          <a data-id="mostUsedForm" href="/forms/">Forms</a>
          <a data-id="logIn" href="/login">Login</a>
        </nav>
      `
    )

    await expect(
      collectHeaderAbsoluteHrefErrors(
        page,
        [
          { dataId: 'mostUsedForm', pathname: '/forms' },
          { dataId: 'logIn', pathname: '/login' }
        ],
        { hrefPolicy: 'relaxedPath' }
      )
    ).resolves.toEqual([])
  })

  test('uses main as the automatic landing content root when content id is absent', async ({ page }) => {
    await loadHtml(
      page,
      `
        <main>
          <a href="/lp/merge-pdf/">Merge PDF</a>
          <a href="/lp/edit-pdf">Edit PDF</a>
        </main>
      `
    )

    await expect(
      collectLandingAbsoluteHrefErrors(page, ['/lp/merge-pdf', '/lp/edit-pdf'], {
        hrefPolicy: 'relaxedPath'
      })
    ).resolves.toEqual([])
  })

  test('accepts the footerLogo alias and normalizes footer paths', async ({ page }) => {
    await loadHtml(
      page,
      `
        <footer class="pdf-footer">
          <a data-id="footerLogo" href="https://seo-helper.test/">Home</a>
          <a href="https://seo-helper.test/forms/">Forms</a>
          <a href="https://seo-helper.test/contact">Contact</a>
        </footer>
      `
    )

    await expect(
      collectFooterAbsoluteHrefErrors(page, ['/forms', '/contact/'], {
        footerSelector: 'footer.pdf-footer'
      })
    ).resolves.toEqual([])
  })

  test('matches forms links whose data-id requires selector escaping', async ({ page }) => {
    const html = FORMS_PAGE_LINK_CHECKS.map(
      ({ dataId, pathname }) => `<a data-id="${dataId}" href="https://seo-helper.test${pathname}/">${dataId}</a>`
    ).join('\n')
    await loadHtml(page, html)

    await expect(collectFormsPageAbsoluteHrefErrors(page)).resolves.toEqual([])
  })
})
