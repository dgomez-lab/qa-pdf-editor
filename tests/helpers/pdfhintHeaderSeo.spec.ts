import { test, expect, type Page } from '@playwright/test'
import { collectPdfhintHeaderSeoErrors } from './pdfhintHeaderSeo'

async function openPdfhintMarkup(page: Page, body: string): Promise<void> {
  await page.route('https://pdfhint.test/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html><body>${body}</body></html>`
    })
  })
  await page.goto('https://pdfhint.test/')
}

test.describe('collectPdfhintHeaderSeoErrors', () => {
  test('accepts role login link and relative forms link', async ({ page }) => {
    await openPdfhintMarkup(
      page,
      `
        <nav><a href="https://pdfhint.test/login">Log in</a></nav>
        <main><a href="/forms">Forms library</a></main>
      `
    )

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([])
  })

  test('falls back to data-id login link and accepts English login path', async ({ page }) => {
    await openPdfhintMarkup(
      page,
      `
        <nav><a data-id="logIn" href="https://pdfhint.test/en/login">Account</a></nav>
        <main><a href="https://pdfhint.test/forms/">Forms library</a></main>
      `
    )

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([])
  })

  test('reports missing visible login link before checking forms', async ({ page }) => {
    await openPdfhintMarkup(page, '<main><a href="/forms">Forms library</a></main>')

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([
      'missing visible Login link in main navigation'
    ])
  })

  test('reports invalid login hrefs and wrong forms pathnames', async ({ page }) => {
    await openPdfhintMarkup(
      page,
      `
        <nav><a data-id="logIn" href="not a url">Account</a></nav>
        <main><a href="/forms-old">Forms library</a></main>
      `
    )

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([
      'Login: expected absolute http(s) href, got: not a url',
      'Login: invalid URL not a url',
      'Forms link: expected pathname /forms, got /forms-old'
    ])
  })
})
