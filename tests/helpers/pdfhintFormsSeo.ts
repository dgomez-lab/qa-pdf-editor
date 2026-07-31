import type { Page } from '@playwright/test'
import { FORMS_PAGE_LINK_CHECKS } from './seoAbsoluteHrefs'

export function normalizeFormsPathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function collectFormsPathLinkErrors(
  hrefs: readonly (string | null | undefined)[],
  wantedPathnames: readonly string[],
  origin: string
): string[] {
  const present = new Set<string>()
  for (const href of hrefs) {
    if (!href) continue
    try {
      present.add(normalizeFormsPathname(new URL(href.trim(), `${origin}/`).pathname))
    } catch {
      /* ignore */
    }
  }

  const errors: string[] = []
  for (const want of wantedPathnames) {
    if (!present.has(normalizeFormsPathname(want))) {
      errors.push(`forms grid: missing link with pathname ${want}`)
    }
  }
  return errors
}

/**
 * Grid /forms en pdfhint no usa los mismos data-id que el proyecto Cucumber legacy;
 * validamos que exista un enlace hacia cada pathname esperado dentro de main.
 */
export async function collectPdfhintFormsPathLinkErrors(page: Page): Promise<string[]> {
  const pathnames = FORMS_PAGE_LINK_CHECKS.map((c) => c.pathname)
  const { hrefs, origin } = await page.evaluate(() => {
    const root = document.querySelector('main') || document.body
    const anchors = root.querySelectorAll('a[href]')
    const hrefs: (string | null)[] = []
    for (let i = 0; i < anchors.length; i++) {
      hrefs.push(anchors[i].getAttribute('href'))
    }
    return { hrefs, origin: window.location.origin }
  })
  return collectFormsPathLinkErrors(hrefs, pathnames, origin)
}
