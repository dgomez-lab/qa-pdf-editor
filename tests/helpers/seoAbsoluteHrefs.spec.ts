import { test, expect, type Page } from '@playwright/test'
import {
  collectFooterAbsoluteHrefErrors,
  collectHeaderAbsoluteHrefErrors,
  waitForMvpsHeaderHydration
} from './seoAbsoluteHrefs'

async function routeHtml(page: Page, html: string): Promise<void> {
  await page.route('https://example.test/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: html
    })
  )
  await page.goto('https://example.test/')
}

async function withBaseUrl<T>(baseUrl: string, fn: () => Promise<T>): Promise<T> {
  const previous = process.env.BASE_URL
  process.env.BASE_URL = baseUrl
  try {
    return await fn()
  } finally {
    if (previous === undefined) delete process.env.BASE_URL
    else process.env.BASE_URL = previous
  }
}

test.describe('seoAbsoluteHrefs', () => {
  test('waits for MVPS header link hydration before continuing', async ({ page }) => {
    await withBaseUrl('https://red.mvps.website/?x-token-qa=token', async () => {
      await page.setContent(`
        <a data-id="logIn" href="https://red.mvps.website/login">Log In</a>
        <a data-id="mostUsedForm" href="/most-used-forms">Forms</a>
        <script>
          setTimeout(() => {
            document.querySelector('a[data-id="mostUsedForm"]').setAttribute('href', '/forms')
          }, 50)
        </script>
      `)

      await expect(waitForMvpsHeaderHydration(page, 2_000)).resolves.toBeUndefined()
    })
  })

  test('enforces absolute header hrefs unless relaxed path policy is requested', async ({ page }) => {
    await withBaseUrl('https://staging.pdfhint.com', async () => {
      const checks = [
        { dataId: 'mostUsedForm', pathname: '/forms' },
        { dataId: 'logIn', pathname: '/login' }
      ]

      await routeHtml(
        page,
        `
          <a data-id="mostUsedForm" href="/forms">Forms</a>
          <a data-id="logIn" href="https://example.test/sign-in">Log In</a>
        `
      )

      await expect(collectHeaderAbsoluteHrefErrors(page, checks)).resolves.toEqual([
        'mostUsedForm: href must be absolute http(s), got: /forms',
        'logIn: expected pathname /login, got /sign-in'
      ])
      await expect(
        collectHeaderAbsoluteHrefErrors(page, checks, { hrefPolicy: 'relaxedPath' })
      ).resolves.toEqual(['logIn: expected pathname /login, got /sign-in'])
    })
  })

  test('accepts footerLogo as the home link and normalizes trailing slashes', async ({ page }) => {
    await withBaseUrl('https://staging.pdfhint.com', async () => {
      await routeHtml(
        page,
        `
          <footer class="footer">
            <a data-id="footerLogo" href="https://example.test/">Home</a>
            <a href="https://example.test/forms/">Forms</a>
            <a href="https://example.test/contact">Contact</a>
          </footer>
        `
      )

      await expect(
        collectFooterAbsoluteHrefErrors(page, ['/forms', '/contact/'], {
          footerSelector: 'footer.footer'
        })
      ).resolves.toEqual([])
    })
  })
})
