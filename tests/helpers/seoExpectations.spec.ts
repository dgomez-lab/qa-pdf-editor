import { test, expect } from '@playwright/test'
import { FOOTER_NON_HOME_PATHNAMES, LANDING_LP_PATHNAMES } from './seoAbsoluteHrefs'
import { setPdfhintScenarioActive } from './pdfhintScenario'
import {
  PDFHINT_FOOTER_PATHNAMES,
  PDFHINT_HOME_LP_PATHNAMES,
  footerPathnamesForSite,
  footerRootSelectorForSite,
  headerLinkChecksForBaseUrl,
  hrefPolicyForSite,
  isPdfhintSite,
  landingPathnamesForSite
} from './seoExpectations'

function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
  const previous: Record<string, string | undefined> = {}
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key]
    const value = vars[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    run()
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
}

test.describe('seoExpectations site policy', () => {
  test.beforeEach(() => {
    setPdfhintScenarioActive(false)
  })

  test.afterEach(() => {
    setPdfhintScenarioActive(false)
  })

  test('treats pdfhint BASE_URL hosts as pdfhint site with relaxed SEO policy', () => {
    withEnv({ BASE_URL: 'https://staging.pdfhint.com' }, () => {
      expect(isPdfhintSite()).toBe(true)
      expect(hrefPolicyForSite()).toBe('relaxedPath')
      expect(footerRootSelectorForSite()).toBe('footer.footer')
      expect(landingPathnamesForSite()).toEqual([...PDFHINT_HOME_LP_PATHNAMES])
      expect(footerPathnamesForSite()).toEqual([...PDFHINT_FOOTER_PATHNAMES])
    })
  })

  test('defaults unset BASE_URL to staging.pdfhint.com', () => {
    withEnv({ BASE_URL: undefined }, () => {
      expect(isPdfhintSite()).toBe(true)
      expect(hrefPolicyForSite()).toBe('relaxedPath')
    })
  })

  test('active pdfhint scenario overrides a non-pdfhint BASE_URL', () => {
    withEnv({ BASE_URL: 'https://staging.pdfmerges.com' }, () => {
      expect(isPdfhintSite()).toBe(false)
      setPdfhintScenarioActive(true)
      expect(isPdfhintSite()).toBe(true)
      expect(hrefPolicyForSite()).toBe('relaxedPath')
    })
  })

  test('uses MVPS pathnames, login checks, and strict href policy for non-pdfhint hosts', () => {
    withEnv({ BASE_URL: 'https://staging.pdfmerges.com', SEO_LOGIN_PATHNAME: undefined }, () => {
      expect(isPdfhintSite()).toBe(false)
      expect(hrefPolicyForSite()).toBe('strictHttp')
      expect(footerRootSelectorForSite()).toBe('[class*="FooterContainer"]')
      expect(headerLinkChecksForBaseUrl()).toEqual([
        { dataId: 'mostUsedForm', pathname: '/forms' },
        { dataId: 'logIn', pathname: '/login' }
      ])
      expect(landingPathnamesForSite()).toEqual([...LANDING_LP_PATHNAMES])
      expect(footerPathnamesForSite()).toEqual([...FOOTER_NON_HOME_PATHNAMES])
    })
  })

  test('pdfhint header login path honors trimmed SEO_LOGIN_PATHNAME override', () => {
    withEnv(
      { BASE_URL: 'https://staging.pdfhint.com', SEO_LOGIN_PATHNAME: ' /es/login ' },
      () => {
        expect(headerLinkChecksForBaseUrl()).toEqual([
          { dataId: 'mostUsedForm', pathname: '/forms' },
          { dataId: 'logIn', pathname: '/es/login' }
        ])
      }
    )
  })
})
