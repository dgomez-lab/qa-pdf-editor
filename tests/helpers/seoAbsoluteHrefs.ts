/**
 * Misma lógica que qai-pa-pdf-editor/src/steps/seoSteps.ts (scripts en navegador).
 * Comprueba que los <a href> de marketing/navegación sean URLs absolutas http(s).
 */
import type { Page } from '@playwright/test'
import { isMvpsMergedStage } from './siteContext'

export type HeaderLinkCheck = { dataId: string; pathname: string }
export type FormsLinkCheck = { dataId: string; pathname: string }

export const HEADER_LINK_CHECKS: readonly HeaderLinkCheck[] = [
  { dataId: 'mostUsedForm', pathname: '/forms' },
  { dataId: 'logIn', pathname: '/login' }
]

export const LANDING_LP_PATHNAMES = [
  '/lp/compress-pdf',
  '/lp/edit-pdf',
  '/lp/edit-fill-pdf',
  '/lp/edit-scanned-pdf',
  '/lp/insert-image',
  '/lp/watermark',
  '/lp/rotate-pdf',
  '/lp/delete-pdf-pages',
  '/lp/pdf-reader',
  '/lp/pdf-converter',
  '/lp/word-to-pdf',
  '/lp/jpg-to-pdf',
  '/lp/png-to-pdf',
  '/lp/powerpoint-to-pdf',
  '/lp/excel-to-pdf',
  '/lp/sign-pdf',
  '/lp/pdf-to-word',
  '/lp/pdf-to-jpg',
  '/lp/pdf-to-png',
  '/lp/pdf-to-powerpoint',
  '/lp/pdf-to-excel',
  '/lp/split-pdf',
  '/lp/merge-pdf'
] as const

export const FOOTER_NON_HOME_PATHNAMES = [
  '/forms',
  '/downloads',
  '/about-us',
  '/terms-of-use',
  '/privacy-policy',
  '/terms-and-conditions',
  '/cookies',
  '/faqs',
  '/contact'
] as const

export const FORMS_PAGE_LINK_CHECKS: readonly FormsLinkCheck[] = [
  { dataId: 'Form 1040 2021', pathname: '/lp/1040-2021-form' },
  { dataId: 'Form 1040 — Individual Income Tax Return (2022)', pathname: '/lp/1040-form' },
  { dataId: 'Social Security Card Replacement', pathname: '/lp/social-security-card-form' },
  { dataId: 'Form 1099 MISC 2022', pathname: '/lp/form-1099-misc-2022' },
  { dataId: 'Form 1099-NEC 2023', pathname: '/lp/form-1099-nec-2022' },
  { dataId: 'Form W-2, Wage and Tax Statement', pathname: '/lp/w2-form' },
  { dataId: '1095 A Form 2022-2023', pathname: '/lp/form-1095-a' },
  { dataId: 'Philippines Passport Application Form', pathname: '/lp/ph-passport-application-form' },
  { dataId: 'Form 941 2023', pathname: '/lp/form-941' },
  { dataId: 'Fedex Door Tag Form', pathname: '/lp/fedex-door-tag' },
  { dataId: 'DA Form 31 2022-2023', pathname: '/lp/da-31' },
  { dataId: 'Schedule C (Form 1040) 2022-2023', pathname: '/lp/schedule-c-2022' },
  { dataId: 'Obituary Template Form', pathname: '/lp/obituary-template' },
  /** Mismo carácter U+2019 que en el HTML del grid /forms (seoSteps Cucumber). */
  { dataId: 'Create a Doctor\u2019s Note Template', pathname: '/lp/doctors-note-template' },
  { dataId: 'Gift Certificate Form', pathname: '/lp/gift-certificate' },
  { dataId: 'Marriage Certificate', pathname: '/lp/marriage-certificate' },
  { dataId: 'DS 11 form 2022-2023', pathname: '/lp/ds-11-form' },
  { dataId: 'Form W-4 2023', pathname: '/lp/w4-form-2023' },
  { dataId: 'Form W-9 2026', pathname: '/lp/form-w9' }
]

/** strictHttp: igual que Cucumber (solo href https?). relaxedPath: resuelve relativos con el origin de la página. */
export type SeoHrefPolicy = 'strictHttp' | 'relaxedPath'

function seoHydrationTimeoutMs(): number {
  return process.env.CI ? 45_000 : 20_000
}

export async function waitForMvpsHeaderHydration(page: Page, timeoutMs?: number): Promise<void> {
  if (!isMvpsMergedStage()) return
  const t = timeoutMs ?? seoHydrationTimeoutMs()
  await page.locator('a[data-id="logIn"]').first().waitFor({ state: 'visible', timeout: t })
  await page.waitForFunction(
    () => {
      const anchor = document.querySelector('a[data-id="mostUsedForm"]')
      const href = anchor?.getAttribute('href')
      if (!href?.trim()) return false
      try {
        const p = new URL(href.trim(), window.location.origin).pathname.replace(/\/$/, '') || '/'
        return p === '/forms'
      } catch {
        return href.includes('/forms') && !href.includes('most-used-forms')
      }
    },
    { timeout: t }
  )
}

export async function waitForMvpsFormsGridHydration(page: Page, timeoutMs?: number): Promise<void> {
  if (!isMvpsMergedStage()) return
  const t = timeoutMs ?? seoHydrationTimeoutMs()
  const firstId = FORMS_PAGE_LINK_CHECKS[0]?.dataId
  if (!firstId) return
  await page.locator(`a[data-id=${JSON.stringify(firstId)}]`).first().waitFor({ state: 'visible', timeout: t })
}

export async function collectHeaderAbsoluteHrefErrors(
  page: Page,
  checks: readonly HeaderLinkCheck[] = HEADER_LINK_CHECKS,
  opts?: { hrefPolicy?: SeoHrefPolicy }
): Promise<string[]> {
  await waitForMvpsHeaderHydration(page)
  const list = checks.map((c) => ({ ...c }))
  const policy = opts?.hrefPolicy ?? 'strictHttp'
  return page.evaluate(
    ({ listIn, policy: pol }) => {
      const norm = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)
      const errors: string[] = []
      const pageOrigin = window.location.origin
      for (const c of listIn) {
        const nodes = document.querySelectorAll(`a[data-id="${c.dataId}"]`)
        if (nodes.length === 0) {
          errors.push(`missing a[data-id="${c.dataId}"]`)
          continue
        }
        for (let j = 0; j < nodes.length; j++) {
          const href = nodes[j].getAttribute('href')
          if (!href || href.trim() === '') {
            errors.push(`${c.dataId}: missing href`)
            continue
          }
          const h = href.trim()
          if (pol === 'strictHttp' && !/^https?:\/\//i.test(h)) {
            errors.push(`${c.dataId}: href must be absolute http(s), got: ${href}`)
            continue
          }
          let pathname: string
          try {
            pathname = /^https?:\/\//i.test(h)
              ? new URL(h).pathname
              : new URL(h, `${pageOrigin}/`).pathname
          } catch {
            errors.push(`${c.dataId}: invalid URL: ${href}`)
            continue
          }
          if (norm(pathname) !== norm(c.pathname)) {
            errors.push(`${c.dataId}: expected pathname ${c.pathname}, got ${pathname}`)
          }
        }
      }
      return errors
    },
    { listIn: list, policy }
  )
}

export async function collectLandingAbsoluteHrefErrors(
  page: Page,
  pathnames: readonly string[] = LANDING_LP_PATHNAMES as unknown as string[],
  opts?: { hrefPolicy?: SeoHrefPolicy; contentRoot?: 'contentId' | 'main' | 'auto' }
): Promise<string[]> {
  const paths = [...pathnames]
  const policy = opts?.hrefPolicy ?? 'strictHttp'
  const rootMode = opts?.contentRoot ?? 'auto'
  return page.evaluate(
    ({ pathList, policy: pol, rootMode: rm }) => {
      const errors: string[] = []
      let content: Element | null = null
      if (rm === 'contentId') content = document.getElementById('content')
      else if (rm === 'main') content = document.querySelector('main')
      else {
        content = document.getElementById('content') || document.querySelector('main')
      }
      if (!content) {
        errors.push('missing #content or main')
        return errors
      }
      const origin = window.location.origin
      const pathnameOf = (href: string | null) => {
        if (!href) return null
        try {
          const h = href.trim()
          if (pol === 'strictHttp' && !/^https?:\/\//i.test(h)) return null
          const raw = /^https?:\/\//i.test(h) ? new URL(h).pathname : new URL(h, `${origin}/`).pathname
          if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1)
          return raw
        } catch {
          return null
        }
      }
      for (const p of pathList) {
        const want = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
        let ok = false
        const anchors = content.querySelectorAll('a[href]')
        for (let j = 0; j < anchors.length; j++) {
          const href = anchors[j].getAttribute('href')
          const pn = pathnameOf(href)
          if (pn === want) {
            ok = true
            break
          }
        }
        if (!ok) {
          errors.push(
            pol === 'strictHttp'
              ? `no absolute <a> in #content with pathname ${p}`
              : `no <a> in #content with pathname ${p} (after resolving hrefs)`
          )
        }
      }
      return errors
    },
    { pathList: paths, policy, rootMode }
  )
}

export async function collectFooterAbsoluteHrefErrors(
  page: Page,
  pathnames: readonly string[] = FOOTER_NON_HOME_PATHNAMES as unknown as string[],
  opts?: { hrefPolicy?: SeoHrefPolicy; footerSelector?: string }
): Promise<string[]> {
  const extraPaths = [...pathnames]
  const policy = opts?.hrefPolicy ?? 'strictHttp'
  const footerSelector = opts?.footerSelector ?? '[class*="FooterContainer"]'
  return page.evaluate(
    ({ pathList, policy: pol, footerSelector: fs }) => {
      const errors: string[] = []
      const footer = document.querySelector(fs)
      if (!footer) {
        errors.push(`missing footer root: ${fs}`)
        return errors
      }
      const origin = window.location.origin
      const pathnameOf = (href: string | null) => {
        if (!href) return null
        try {
          const h = href.trim()
          if (pol === 'strictHttp' && !/^https?:\/\//i.test(h)) return null
          const raw = /^https?:\/\//i.test(h) ? new URL(h).pathname : new URL(h, `${origin}/`).pathname
          if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1)
          return raw
        } catch {
          return null
        }
      }
      const logo = footer.querySelector('a[data-id="logo"], a[data-id="footerLogo"]')
      if (!logo) {
        errors.push('footer: missing logo link (data-id logo or footerLogo)')
      } else {
        const logoHref = logo.getAttribute('href')
        if (!logoHref) {
          errors.push('footer logo: missing href')
        } else if (pol === 'strictHttp' && !/^https?:\/\//i.test(logoHref.trim())) {
          errors.push(`footer logo: href must be absolute http(s), got: ${logoHref}`)
        } else {
          const pn = pathnameOf(logoHref)
          if (pn !== '/' && pn !== '') {
            errors.push(`footer logo: expected pathname /, got ${pn}`)
          }
        }
      }
      for (const p of pathList) {
        const want = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
        let ok = false
        const anchors = footer.querySelectorAll('a[href]')
        for (let j = 0; j < anchors.length; j++) {
          const href = anchors[j].getAttribute('href')
          if (pathnameOf(href) === want) {
            ok = true
            break
          }
        }
        if (!ok) {
          errors.push(
            pol === 'strictHttp'
              ? `footer: no absolute <a> with pathname ${p}`
              : `footer: no <a> with pathname ${p} (after resolving hrefs)`
          )
        }
      }
      return errors
    },
    { pathList: extraPaths, policy, footerSelector }
  )
}

export async function collectFormsPageAbsoluteHrefErrors(
  page: Page,
  opts?: { hrefPolicy?: SeoHrefPolicy }
): Promise<string[]> {
  await waitForMvpsFormsGridHydration(page)
  const checks = FORMS_PAGE_LINK_CHECKS.map((c) => ({ ...c }))
  const policy = opts?.hrefPolicy ?? 'strictHttp'
  return page.evaluate(
    ({ list, policy: pol }) => {
      const errors: string[] = []
      const origin = window.location.origin
      for (const c of list) {
        const sel = `a[data-id=${JSON.stringify(c.dataId)}]`
        const node = document.querySelector(sel)
        if (!node) {
          errors.push(`missing ${sel}`)
          continue
        }
        const href = node.getAttribute('href')
        if (!href) {
          errors.push(`${c.dataId}: missing href`)
          continue
        }
        const h = href.trim()
        if (pol === 'strictHttp' && !/^https?:\/\//i.test(h)) {
          errors.push(`${c.dataId}: href must be absolute http(s), got: ${href}`)
          continue
        }
        let pathname: string
        try {
          pathname = /^https?:\/\//i.test(h) ? new URL(h).pathname : new URL(h, `${origin}/`).pathname
        } catch {
          errors.push(`${c.dataId}: invalid URL: ${href}`)
          continue
        }
        const pn = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
        const exp = c.pathname.length > 1 && c.pathname.endsWith('/') ? c.pathname.slice(0, -1) : c.pathname
        if (pn !== exp) {
          errors.push(`${c.dataId}: expected pathname ${c.pathname}, got ${pathname}`)
        }
      }
      return errors
    },
    { list: checks, policy }
  )
}
