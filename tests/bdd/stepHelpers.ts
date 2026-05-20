import type { Page } from '@playwright/test'
import type { BddWorld } from './fixtures'
import { getLocatorForPage, resolvePageForElement } from './elementRegistry'
import { primaryOrPopup } from './activePage'

export function bddPage(w: BddWorld, main: Page): Page {
  if ((w.currentPage === 'CrmCustomer' || w.currentPage === 'CrmCustomersTable' || w.currentPage === 'CrmHome') && w.crmPage && !w.crmPage.isClosed()) {
    return w.crmPage
  }
  return primaryOrPopup(w, main)
}

export function bddLocator(w: BddWorld, main: Page, elementLabel: string) {
  const pageName = resolvePageForElement(w.currentPage, elementLabel)
  const p =
    (pageName === 'CrmCustomer' || pageName === 'CrmCustomersTable' || pageName === 'CrmHome') &&
    w.crmPage &&
    !w.crmPage.isClosed()
      ? w.crmPage
      : bddPage(w, main)
  return getLocatorForPage(p, pageName, elementLabel)
}

const VISUAL_PAGE_TO_SNAPSHOT: Record<string, string> = {
  Home: 'visual-home',
  Login: 'visual-login',
  Editor: 'visual-editor',
  Account: 'visual-account',
  'Account Canceled': 'visual-account-canceled',
  Forms: 'visual-forms',
  'Upload Modal': 'visual-upload-modal',
  'Editor Modal No Paid': 'visual-editor-modal-no-paid',
  'Editor Modal Paid': 'visual-editor-modal-paid',
  'Editor Modal Convert Paid': 'visual-editor-modal-convert-paid',
  'Editor Select Mail To Share Modal': 'visual-editor-modal-share-mail',
  'Editor Payment Modal': 'visual-editor-modal-payment',
  'About Us': 'visual-about-us',
  Contact: 'visual-contact',
  FAQs: 'visual-faqs',
  Downloads: 'visual-downloads',
  'Terms of Use': 'visual-terms-of-use',
  'Privacy Policy': 'visual-privacy-policy',
  'Terms and Conditions': 'visual-terms-and-conditions',
  Cookies: 'visual-cookies',
  Unsubscribe: 'visual-cancel-subscription',
  'Form W4': 'visual-form-w4',
  'Form W9': 'visual-form-w9',
  'Form 1040 2021': 'visual-form-1040-2021',
  'Form 1040': 'visual-form-1040',
  'Form Social': 'visual-form-social',
  'Form 1099': 'visual-form-1099',
  'Form 1099 Nec': 'visual-form-1099-nec',
  'Form W2': 'visual-form-w2',
  'Form 1095': 'visual-form-1095',
  'Form Philippines': 'visual-form-philippines',
  'Form 941': 'visual-form-941',
  'Form Feedex': 'visual-form-feedex',
  'Form Da': 'visual-form-da',
  'Form Schedule': 'visual-form-schedule',
  'Form Ds11': 'visual-form-ds11',
  'Form Obituary': 'visual-form-obituary',
  'Form Marriage': 'visual-form-marriage',
  'Form Gift': 'visual-form-gift',
  '404': 'visual-404',
  'Dashboard Onboarding': 'visual-dashboard-onboarding',
  Dashboard: 'visual-dashboard',
  'Dashboard My Documents': 'visual-dashboard-my-documents',
  'Dashboard Most Used Forms': 'visual-dashboard-most-used-forms',
  'Dashboard Trash Bin': 'visual-dashboard-trash',
  'Dashboard Delete Modal': 'visual-dashboard-delete-modal',
  Compress: 'visual-product-compress',
  Edit: 'visual-product-edit',
  'Edit Fill': 'visual-product-edit-fill',
  'Edit Scanned': 'visual-product-edit-scanned',
  'Insert Image': 'visual-product-insert-image',
  Watermark: 'visual-product-watermark',
  Rotate: 'visual-product-rotate',
  'Delete Pages': 'visual-product-delete-pages',
  'PDF Reader': 'visual-product-pdf-reader',
  'Word To PDF': 'visual-product-word-to-pdf',
  'JPG To PDF': 'visual-product-jpg-to-pdf',
  'PNG To PDF': 'visual-product-png-to-pdf',
  'PowerPoint To PDF': 'visual-product-powerpoint-to-pdf',
  'Excel To PDF': 'visual-product-excel-to-pdf',
  Sign: 'visual-product-sign',
  'PDF To Word': 'visual-product-pdf-to-word',
  'PDF To JPG': 'visual-product-pdf-to-jpg',
  'PDF To PNG': 'visual-product-pdf-to-png',
  'PDF To PowerPoint': 'visual-product-pdf-to-powerpoint',
  'PDF To Excel': 'visual-product-pdf-to-excel',
  Split: 'visual-product-split',
  Merge: 'visual-product-merge'
}

export function visualSnapshotBaseForPageLabel(label: string): string {
  const k = label.trim()
  return VISUAL_PAGE_TO_SNAPSHOT[k] ?? `visual-${k.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

const screenshotOpts = {
  fullPage: false,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const,
  maxDiffPixels: 2500
}

export { screenshotOpts }
