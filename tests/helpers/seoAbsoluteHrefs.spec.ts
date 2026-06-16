import { test, expect } from '@playwright/test'
import {
  collectFormsPageAbsoluteHrefErrors,
  collectHeaderAbsoluteHrefErrors,
  FORMS_PAGE_LINK_CHECKS
} from './seoAbsoluteHrefs'

async function withMvpsBaseUrl(run: () => Promise<void>): Promise<void> {
  const previous = process.env.BASE_URL
  process.env.BASE_URL = 'https://red.mvps.website'
  try {
    await run()
  } finally {
    if (previous === undefined) delete process.env.BASE_URL
    else process.env.BASE_URL = previous
  }
}

test.describe('SEO absolute href hydration', () => {
  test('waits for MVPS header hydration before collecting header href errors', async ({ page }) => {
    await withMvpsBaseUrl(async () => {
      await page.setContent(`
        <a data-id="logIn" href="https://red.mvps.website/login">Log in</a>
        <a data-id="mostUsedForm" href="https://red.mvps.website/most-used-forms">Forms</a>
      `)
      await page.evaluate(() => {
        setTimeout(() => {
          document
            .querySelector('a[data-id="mostUsedForm"]')
            ?.setAttribute('href', 'https://red.mvps.website/forms')
        }, 50)
      })

      const errors = await collectHeaderAbsoluteHrefErrors(
        page,
        [
          { dataId: 'mostUsedForm', pathname: '/forms' },
          { dataId: 'logIn', pathname: '/login' }
        ],
        { hrefPolicy: 'strictHttp' }
      )

      expect(errors).toEqual([])
    })
  })

  test('waits for MVPS forms grid hydration before collecting form href errors', async ({ page }) => {
    await withMvpsBaseUrl(async () => {
      await page.setContent('<main id="forms"></main>')
      await page.evaluate((checks) => {
        setTimeout(() => {
          const root = document.getElementById('forms')
          if (!root) return
          for (const check of checks) {
            const anchor = document.createElement('a')
            anchor.setAttribute('data-id', check.dataId)
            anchor.setAttribute('href', `https://red.mvps.website${check.pathname}`)
            anchor.textContent = check.dataId
            root.appendChild(anchor)
          }
        }, 50)
      }, FORMS_PAGE_LINK_CHECKS)

      const errors = await collectFormsPageAbsoluteHrefErrors(page, { hrefPolicy: 'strictHttp' })

      expect(errors).toEqual([])
    })
  })
})
