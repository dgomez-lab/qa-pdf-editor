import type { Page } from '@playwright/test'
import { FORMS_PAGE_LINK_CHECKS } from './seoAbsoluteHrefs'

/**
 * Grid /forms en pdfhint no usa los mismos data-id que el proyecto Cucumber legacy;
 * validamos que exista un enlace hacia cada pathname esperado dentro de main.
 */
export async function collectPdfhintFormsPathLinkErrors(page: Page): Promise<string[]> {
  const pathnames = FORMS_PAGE_LINK_CHECKS.map((c) => c.pathname)
  return page.evaluate((paths) => {
    const errors: string[] = []
    const root = document.querySelector('main') || document.body
    const origin = window.location.origin
    const norm = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)
    for (const want of paths) {
      const w = norm(want)
      const anchors = root.querySelectorAll('a[href]')
      let ok = false
      for (let i = 0; i < anchors.length; i++) {
        const href = anchors[i].getAttribute('href')
        if (!href) continue
        try {
          const pn = norm(new URL(href.trim(), `${origin}/`).pathname)
          if (pn === w) {
            ok = true
            break
          }
        } catch {
          /* ignore */
        }
      }
      if (!ok) errors.push(`forms grid: missing link with pathname ${want}`)
    }
    return errors
  }, pathnames)
}
