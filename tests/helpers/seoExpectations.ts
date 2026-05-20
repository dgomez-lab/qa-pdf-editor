import type { HeaderLinkCheck } from './seoAbsoluteHrefs'
import { FOOTER_NON_HOME_PATHNAMES, LANDING_LP_PATHNAMES } from './seoAbsoluteHrefs'
import type { SeoHrefPolicy } from './seoAbsoluteHrefs'
import { isPdfhintScenario } from './pdfhintScenario'

export function isPdfhintSite(): boolean {
  if (isPdfhintScenario()) return true
  const u = (process.env.BASE_URL || 'https://staging.pdfhint.com').toLowerCase()
  return u.includes('pdfhint')
}

export function headerLinkChecksForBaseUrl(): HeaderLinkCheck[] {
  if (isPdfhintSite()) {
    const loginPath = process.env.SEO_LOGIN_PATHNAME?.trim() || '/login'
    return [
      { dataId: 'mostUsedForm', pathname: '/forms' },
      { dataId: 'logIn', pathname: loginPath }
    ]
  }
  return [
    { dataId: 'mostUsedForm', pathname: '/forms' },
    { dataId: 'logIn', pathname: '/login' }
  ]
}

/** Rutas /lp/ presentes en el HTML estático de la Home de staging.pdfhint.com (2026). */
export const PDFHINT_HOME_LP_PATHNAMES = [
  '/lp/1040-2021-form',
  '/lp/add-image-to-pdf',
  '/lp/compress-pdf',
  '/lp/edit-pdf',
  '/lp/excel-to-pdf',
  '/lp/form-1099-misc-2022',
  '/lp/form-w9',
  '/lp/jpg-to-pdf',
  '/lp/merge-pdf',
  '/lp/pdf-to-excel',
  '/lp/pdf-to-jpg',
  '/lp/pdf-to-png',
  '/lp/pdf-to-powerpoint',
  '/lp/pdf-to-word',
  '/lp/png-to-pdf',
  '/lp/powerpoint-to-pdf',
  '/lp/rotate-pdf',
  '/lp/sign-pdf',
  '/lp/social-security-card-form',
  '/lp/split-pdf',
  '/lp/w2-form',
  '/lp/w4-form-2023',
  '/lp/watermark',
  '/lp/word-to-pdf'
] as const

/** Footer marketing pdfhint (rutas relativas resueltas con relaxedPath). */
export const PDFHINT_FOOTER_PATHNAMES = [
  '/forms',
  '/contact',
  '/about',
  '/faqs',
  '/terms-and-conditions',
  '/terms',
  '/privacy',
  '/cookies'
] as const

export function landingPathnamesForSite(): readonly string[] {
  if (isPdfhintSite()) return PDFHINT_HOME_LP_PATHNAMES as unknown as string[]
  return LANDING_LP_PATHNAMES as unknown as string[]
}

export function footerPathnamesForSite(): readonly string[] {
  if (isPdfhintSite()) return PDFHINT_FOOTER_PATHNAMES as unknown as string[]
  return FOOTER_NON_HOME_PATHNAMES as unknown as string[]
}

export function hrefPolicyForSite(): SeoHrefPolicy {
  return isPdfhintSite() ? 'relaxedPath' : 'strictHttp'
}

export function footerRootSelectorForSite(): string {
  return isPdfhintSite() ? 'footer.footer' : '[class*="FooterContainer"]'
}
