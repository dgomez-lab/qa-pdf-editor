import type { Locator, Page } from '@playwright/test'
import legacyAccount from './legacy-elements/account/elements.json'
import legacyContact from './legacy-elements/contact/elements.json'
import legacyCrmRoot from './legacy-elements/crm/elements.json'
import legacyCrmCustomer from './legacy-elements/crm/customer/elements.json'
import legacyCrmCustomersTable from './legacy-elements/crm/customersTable/elements.json'
import legacyCrmHome from './legacy-elements/crm/home/elements.json'
import legacyDashboard from './legacy-elements/dashboard/elements.json'
import legacyDownloads from './legacy-elements/downloads/elements.json'
import legacyEditor from './legacy-elements/editor/elements.json'
import legacyHome from './legacy-elements/home/elements.json'
import legacyLanding from './legacy-elements/landing/elements.json'
import legacyLogin from './legacy-elements/login/elements.json'
import legacyCommon from './legacy-elements/components/pdfCommonPageElements.json'

type Finder = Record<string, string>
type ElementEntry = { finder: Finder }

function mergeMaps(...maps: Record<string, ElementEntry>[]): Record<string, ElementEntry> {
  return Object.assign({}, ...maps)
}

const common = legacyCommon as Record<string, ElementEntry>

const LEGACY: Record<string, Record<string, ElementEntry>> = {
  Home: mergeMaps(common, legacyHome as Record<string, ElementEntry>),
  Editor: mergeMaps(common, legacyEditor as Record<string, ElementEntry>),
  Account: legacyAccount as Record<string, ElementEntry>,
  Login: legacyLogin as Record<string, ElementEntry>,
  Contact: legacyContact as Record<string, ElementEntry>,
  Dashboard: legacyDashboard as Record<string, ElementEntry>,
  Landing: legacyLanding as Record<string, ElementEntry>,
  Downloads: legacyDownloads as Record<string, ElementEntry>,
  CrmHome: mergeMaps(legacyCrmRoot as Record<string, ElementEntry>, legacyCrmHome as Record<string, ElementEntry>),
  CrmCustomersTable: mergeMaps(
    legacyCrmRoot as Record<string, ElementEntry>,
    legacyCrmCustomersTable as Record<string, ElementEntry>
  ),
  CrmCustomer: mergeMaps(legacyCrmRoot as Record<string, ElementEntry>, legacyCrmCustomer as Record<string, ElementEntry>)
}

function escapeCssClass(c: string): string {
  return c.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)
}

export function finderToLocator(page: Page, finder: Finder): Locator {
  if (finder.xpath) {
    const x = finder.xpath.startsWith('/') || finder.xpath.startsWith('(') ? finder.xpath : `/${finder.xpath}`
    return page.locator(`xpath=${x}`)
  }
  if (finder.css) return page.locator(finder.css)
  if (finder['data-id']) return page.locator(`[data-id="${finder['data-id']}"]`)
  if (finder.id) return page.locator(`#${CSS.escape(finder.id)}`)
  if (finder.className) {
    const parts = finder.className.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return page.locator('body')
    return page.locator(parts.map((p) => `.${escapeCssClass(p)}`).join(''))
  }
  throw new Error(`Unsupported finder: ${JSON.stringify(finder)}`)
}

export function getLocatorForPage(page: Page, pageName: string, elementLabel: string): Locator {
  const map = LEGACY[pageName]
  if (!map) throw new Error(`Unknown page for elements: ${pageName}`)
  const entry = map[elementLabel]
  if (!entry?.finder) throw new Error(`No element "${elementLabel}" on page ${pageName}`)
  return finderToLocator(page, entry.finder)
}

export function resolvePageForElement(currentPage: string, elementLabel: string): string {
  if (LEGACY[currentPage]?.[elementLabel]) return currentPage
  const order = ['CrmCustomer', 'CrmCustomersTable', 'Editor', 'Home', 'Dashboard', 'Account', 'Login', 'Downloads']
  for (const p of order) {
    if (LEGACY[p]?.[elementLabel]) return p
  }
  return currentPage
}
