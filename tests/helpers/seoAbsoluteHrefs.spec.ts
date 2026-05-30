import { test, expect } from '@playwright/test'
import {
  collectHeaderAbsoluteHrefErrors,
  collectLandingAbsoluteHrefErrors,
  collectFooterAbsoluteHrefErrors,
  collectFormsPageAbsoluteHrefErrors,
  FORMS_PAGE_LINK_CHECKS
} from './seoAbsoluteHrefs'

type EnvSnapshot = Partial<Record<'BASE_URL' | 'CI', string>>

function captureEnv(): EnvSnapshot {
  return {
    BASE_URL: process.env.BASE_URL,
    CI: process.env.CI
  }
}

function restoreEnv(snapshot: EnvSnapshot): void {
  for (const key of Object.keys(snapshot) as Array<keyof EnvSnapshot>) {
    const value = snapshot[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

test.describe('SEO absolute href helpers', () => {
  let envSnapshot: EnvSnapshot

  test.beforeEach(() => {
    envSnapshot = captureEnv()
    process.env.BASE_URL = 'https://staging.pdfhint.com'
    delete process.env.CI
  })

  test.afterEach(() => {
    restoreEnv(envSnapshot)
  })

  test('header checks enforce absolute hrefs in strict mode and accept relative hrefs in relaxed mode', async ({ page }) => {
    await page.setContent(`
      <a data-id="mostUsedForm" href="/forms/">Forms</a>
      <a data-id="logIn" href="https://staging.pdfhint.com/login/">Log in</a>
    `)

    expect(await collectHeaderAbsoluteHrefErrors(page)).toEqual([
      'mostUsedForm: href must be absolute http(s), got: /forms/'
    ])
    expect(await collectHeaderAbsoluteHrefErrors(page, undefined, { hrefPolicy: 'relaxedPath' })).toEqual([])
  })

  test('landing checks can target main content and reject relative hrefs in strict mode', async ({ page }) => {
    await page.setContent(`
      <main>
        <a href="/lp/edit-pdf/">Edit PDF</a>
      </main>
    `)

    expect(
      await collectLandingAbsoluteHrefErrors(page, ['/lp/edit-pdf'], {
        hrefPolicy: 'relaxedPath',
        contentRoot: 'main'
      })
    ).toEqual([])
    expect(
      await collectLandingAbsoluteHrefErrors(page, ['/lp/edit-pdf'], {
        hrefPolicy: 'strictHttp',
        contentRoot: 'main'
      })
    ).toEqual(['no absolute <a> in #content with pathname /lp/edit-pdf'])
  })

  test('footer checks validate logo and required paths with relaxed href resolution', async ({ page }) => {
    await page.setContent(`
      <footer class="footer">
        <a data-id="footerLogo" href="/">Home</a>
        <a href="/forms">Forms</a>
        <a href="/contact/">Contact</a>
      </footer>
    `)

    expect(
      await collectFooterAbsoluteHrefErrors(page, ['/forms', '/contact'], {
        hrefPolicy: 'relaxedPath',
        footerSelector: 'footer.footer'
      })
    ).toEqual([])
  })

  test('forms page checks resolve data-id selectors with punctuation and unicode text', async ({ page }) => {
    const anchors = FORMS_PAGE_LINK_CHECKS.map(
      ({ dataId, pathname }) =>
        `<a data-id="${dataId.replace(/"/g, '&quot;')}" href="https://staging.pdfhint.com${pathname}">${dataId}</a>`
    ).join('\n')
    await page.setContent(anchors)

    expect(await collectFormsPageAbsoluteHrefErrors(page)).toEqual([])
  })
})
