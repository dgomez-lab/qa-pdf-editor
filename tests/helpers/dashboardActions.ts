import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { dashboard } from '../pages/dashboardSelectors'
import { appUrl, isPdfhintApp } from './appUrl'
import { gotoMarketingPath } from './mvpsUrl'

/**
 * Pasos atómicos del Dashboard (paridad con `DashboardPage` legacy).
 */

export const selectors = {
  onboardingCloseModal: dashboard.onboardingCloseModal,
  uploadDocumentButton: dashboard.uploadDocumentButton,
  getFullAccessButton: dashboard.getFullAccessButton,
  dashboardSubscribeBanner: dashboard.dashboardSubscribeBanner,
  onboardingViewTutorialButton: '[data-id="onboardingViewTutorial"]',
  openDocument0Button: '[data-id="dashboardFiles-0-open"]',
  openMyDocument0Button: '[data-id="dashboardMyDocuments-0-open"]',
  openForm0Button: '[data-id="dashboardForms-0-open"]',
  dashboardSideMenuLink: '[data-id="sidebarDashboard"]',
  dashboardMyDocumentsSideMenuLink: '[data-id="sidebarMyDocuments"]',
  dashboardMostUsedFormsSideMenuLink: '[data-id="sidebarMostUsedForms"]',
  dashboardTrashSideMenuLink: '[data-id="sidebarTrash"]',
  trashIcon: '[data-id="trashIcon"]',
  accountMenu: '[data-id="accountMenu"]',
  accountMenuLink: '[data-id="accountMenuAccount"]',
  membershipMenuLink: '[data-id="accountMenuMembership"]',
  dashboardMenuLink: '[data-id="accountMenuDashboard"]',
  logoutMenuLink: '[data-id="accountMenuLogout"]',
  rename0: '[data-id="dashboardFiles-0-rename"]',
  renameInput: '[data-id="modalInput"]',
  renameSubmit: '[data-id="dashboardRenameBtn"]',
  documentName0: '[data-id="dashboardFiles-0"]',
  delete0Bin: '[data-id="dashboardFiles-0-delete"]',
  restore0: '[data-id="dashboardTrash-0-restore"]',
  permanentDelete0: '[data-id="dashboardTrash-0-permanentDelete"]',
  myDocument1Radio: '[data-id="dashboardMyDocuments-1-radio"]',
  openFormSideButton: '[data-id="dashboardOpenForms"]',
  reviewHappyButton: '[data-id="reviewHappy"]',
  reviewNotHappyButton: '[data-id="reviewNotHappy"]',
  pdfSection: '[data-id="pdfSection"]',
  pdfPreviewFailure: '[data-id="pdfPreviewFailure"]'
} as const

export async function closeOnboarding(page: Page): Promise<void> {
  const btn = page.locator(selectors.onboardingCloseModal).first()
  if (await btn.isVisible({ timeout: 30_000 }).catch(() => false)) {
    await btn.click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(500)
  }
}

export async function closeOnboardingOnce(page: Page): Promise<void> {
  await closeOnboarding(page)
}

export function authenticatedAppPath(kind: 'dashboard' | 'account' | 'login'): string {
  if (isPdfhintApp()) {
    if (kind === 'dashboard') return '/en/dashboard'
    if (kind === 'account') return '/en/account'
    return '/en/login'
  }
  if (kind === 'dashboard') return '/dashboard'
  if (kind === 'account') return '/account'
  return '/login'
}

export async function gotoDashboard(page: Page): Promise<void> {
  await gotoMarketingPath(page, appUrl(authenticatedAppPath('dashboard')), {
    waitUntil: 'domcontentloaded'
  })
}

export async function gotoAccount(page: Page): Promise<void> {
  await gotoMarketingPath(page, appUrl(authenticatedAppPath('account')), {
    waitUntil: 'domcontentloaded'
  })
}

export async function gotoLogin(page: Page): Promise<void> {
  await gotoMarketingPath(page, appUrl(authenticatedAppPath('login')), {
    waitUntil: 'domcontentloaded'
  })
}

export async function expectUploadDocumentButton(page: Page): Promise<void> {
  await expect(page.locator(selectors.uploadDocumentButton).first()).toBeVisible({ timeout: 60_000 })
}

export async function clickAccountMenu(page: Page): Promise<void> {
  const m = page.locator(selectors.accountMenu).first()
  await m.waitFor({ state: 'visible', timeout: 30_000 })
  await m.click()
}
