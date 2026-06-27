import { test, expect, type Page } from '@playwright/test'
import { collectPdfhintHeaderSeoErrors } from './pdfhintHeaderSeo'

async function openPdfhintDocument(page: Page, body: string): Promise<void> {
  await page.route('http://pdfhint.test/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body></body></html>'
    })
  })
  await page.goto('http://pdfhint.test/')
  await page.setContent(body)
}

test.describe('collectPdfhintHeaderSeoErrors', () => {
  test('accepts absolute login href and relative forms href', async ({ page }) => {
    await openPdfhintDocument(
      page,
      `
        <nav>
          <a href="https://pdfhint.test/login">Log in</a>
        </nav>
        <main>
          <a href="/forms">Forms</a>
        </main>
      `
    )

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([])
  })

  test('accepts data-id login fallback for localized login path', async ({ page }) => {
    await openPdfhintDocument(
      page,
      `
        <nav>
          <a data-id="logIn" href="https://pdfhint.test/en/login/">Sign in</a>
          <a href="https://pdfhint.test/forms">Forms</a>
        </nav>
      `
    )

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([])
  })

  test('reports broken login and forms navigation hrefs', async ({ page }) => {
    await openPdfhintDocument(
      page,
      `
        <nav>
          <a href="/login">Log in</a>
        </nav>
        <main>
          <a href="/forms-old">Forms</a>
        </main>
      `
    )

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([
      'Login: expected absolute http(s) href, got: /login',
      'Forms link: expected pathname /forms, got /forms-old'
    ])
  })

  test('reports missing forms navigation after login passes', async ({ page }) => {
    await openPdfhintDocument(
      page,
      `
        <nav>
          <a href="https://pdfhint.test/login">Log in</a>
        </nav>
        <main>
          <a href="/downloads">Downloads</a>
        </main>
      `
    )

    await expect(collectPdfhintHeaderSeoErrors(page)).resolves.toEqual([
      'missing link to /forms in main or nav'
    ])
  })
})
