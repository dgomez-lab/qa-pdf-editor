import { test, expect } from '@playwright/test'
import {
  activatePdfhintScenarioEnv,
  deactivatePdfhintScenarioEnv,
  isPdfhintScenario,
  PDFHINT_STAGING_BASE_URL
} from './pdfhintScenario'
import {
  FOOTER_NON_HOME_PATHNAMES,
  LANDING_LP_PATHNAMES
} from './seoAbsoluteHrefs'
import {
  footerPathnamesForSite,
  footerRootSelectorForSite,
  headerLinkChecksForBaseUrl,
  hrefPolicyForSite,
  isPdfhintSite,
  landingPathnamesForSite,
  PDFHINT_FOOTER_PATHNAMES,
  PDFHINT_HOME_LP_PATHNAMES
} from './seoExpectations'

const ENV_KEYS = [
  'BASE_URL',
  'APPEND_QA_TOKEN',
  'EMAIL_SUBJECT_BRAND_PREFIX',
  'APP',
  'SEO_LOGIN_PATHNAME'
] as const

type EnvKey = (typeof ENV_KEYS)[number]

function readEnv(): Record<EnvKey, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
    EnvKey,
    string | undefined
  >
}

function writeEnv(values: Record<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function logInPathname(): string | undefined {
  return headerLinkChecksForBaseUrl().find((check) => check.dataId === 'logIn')?.pathname
}

test.describe('pdfhint scenario SEO configuration', () => {
  let originalEnv: Record<EnvKey, string | undefined>

  test.beforeEach(() => {
    originalEnv = readEnv()
    deactivatePdfhintScenarioEnv()
    for (const key of ENV_KEYS) delete process.env[key]
  })

  test.afterEach(() => {
    deactivatePdfhintScenarioEnv()
    writeEnv(originalEnv)
  })

  test('activates pdfhint defaults for tagged scenarios and clears them afterward', () => {
    activatePdfhintScenarioEnv()

    expect(isPdfhintScenario()).toBe(true)
    expect(isPdfhintSite()).toBe(true)
    expect(process.env.BASE_URL).toBe(PDFHINT_STAGING_BASE_URL)
    expect(process.env.APPEND_QA_TOKEN).toBe('false')
    expect(process.env.EMAIL_SUBJECT_BRAND_PREFIX).toBe('pdfhint')
    expect(process.env.APP).toBe('pdfhint')
    expect(process.env.SEO_LOGIN_PATHNAME).toBe('/login')
    expect(logInPathname()).toBe('/login')
    expect(landingPathnamesForSite()).toEqual(PDFHINT_HOME_LP_PATHNAMES)
    expect(footerPathnamesForSite()).toEqual(PDFHINT_FOOTER_PATHNAMES)
    expect(hrefPolicyForSite()).toBe('relaxedPath')
    expect(footerRootSelectorForSite()).toBe('footer.footer')

    deactivatePdfhintScenarioEnv()

    expect(isPdfhintScenario()).toBe(false)
    for (const key of ENV_KEYS) {
      expect(process.env[key]).toBeUndefined()
    }
  })

  test('preserves custom pdfhint login pathname and restores previous env values', () => {
    const previousEnv: Record<EnvKey, string> = {
      BASE_URL: 'https://merged.example.test',
      APPEND_QA_TOKEN: 'true',
      EMAIL_SUBJECT_BRAND_PREFIX: 'merged',
      APP: 'mergedpdf',
      SEO_LOGIN_PATHNAME: '/en/login'
    }
    writeEnv(previousEnv)

    activatePdfhintScenarioEnv()
    activatePdfhintScenarioEnv()

    expect(process.env.BASE_URL).toBe(PDFHINT_STAGING_BASE_URL)
    expect(process.env.SEO_LOGIN_PATHNAME).toBe('/en/login')
    expect(logInPathname()).toBe('/en/login')

    deactivatePdfhintScenarioEnv()

    expect(readEnv()).toEqual(previousEnv)
  })

  test('uses strict mergedpdf SEO expectations for non-pdfhint base URLs', () => {
    process.env.BASE_URL = 'https://staging.mergedpdf.com'

    expect(isPdfhintScenario()).toBe(false)
    expect(isPdfhintSite()).toBe(false)
    expect(logInPathname()).toBe('/login')
    expect(landingPathnamesForSite()).toEqual(LANDING_LP_PATHNAMES)
    expect(footerPathnamesForSite()).toEqual(FOOTER_NON_HOME_PATHNAMES)
    expect(hrefPolicyForSite()).toBe('strictHttp')
    expect(footerRootSelectorForSite()).toBe('[class*="FooterContainer"]')
  })

  test('normalizes blank pdfhint login pathname during activation then restores it', () => {
    process.env.SEO_LOGIN_PATHNAME = '   '

    activatePdfhintScenarioEnv()

    expect(process.env.SEO_LOGIN_PATHNAME).toBe('/login')
    expect(logInPathname()).toBe('/login')

    deactivatePdfhintScenarioEnv()

    expect(process.env.SEO_LOGIN_PATHNAME).toBe('   ')
  })
})
