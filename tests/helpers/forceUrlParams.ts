import type { Page } from '@playwright/test'
import { gotoMarketingPath } from './mvpsUrl'

export function mergeUrlParameters(currentUrl: string, params: Record<string, string>): string {
  const current = new URL(currentUrl)
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue
    current.searchParams.set(k, v)
  }
  return current.toString()
}

export function forceWrongUrlTarget(currentUrl: string): string {
  return new URL('/this-route-does-not-exist', currentUrl).toString()
}

export async function forceUrlWithParameters(page: Page, params: Record<string, string>): Promise<void> {
  const next = mergeUrlParameters(page.url(), params)
  await gotoMarketingPath(page, next, { waitUntil: 'domcontentloaded' })
}

export async function forceWrongUrl(page: Page): Promise<void> {
  const raw = forceWrongUrlTarget(page.url())
  await gotoMarketingPath(page, raw, { waitUntil: 'domcontentloaded' }).catch(() => {})
}
