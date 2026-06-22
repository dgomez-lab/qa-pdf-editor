import type { Page } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'
import { isMvpsMergedStage } from './siteContext'

function appendQaDisabled(): boolean {
  const v = process.env.APPEND_QA_TOKEN?.trim().toLowerCase()
  return v === '0' || v === 'false' || v === 'no' || v === 'off'
}

function parseQaTokenParam(): { key: string; value: string } {
  const raw = (process.env.QAI_TOKEN_PARAM || 'x-token-qa=niGqCYH7McqERAB').trim().replace(/^\?/, '')
  const eq = raw.indexOf('=')
  if (eq <= 0) return { key: 'x-token-qa', value: raw }
  return { key: raw.slice(0, eq), value: raw.slice(eq + 1) }
}

/**
 * En `*.mvps.website` el acceso QA va con `?x-token-qa=…`.
 * Si `BASE_URL` incluye el token, Playwright al resolver `page.goto('/ruta')` lo **pierde**
 * (URL absoluta de path reemplaza path y no conserva el query del base).
 * Esta función añade el token a rutas relativas o a URLs absolutas del mismo host MVPS.
 */
export function ensureMvpsMarketingUrl(target: string): string {
  if (!isMvpsMergedStage()) return target
  if (appendQaDisabled()) return target

  const { key, value } = parseQaTokenParam()

  try {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      const u = new URL(target)
      if (!u.hostname.includes('mvps.website')) return target
      if (!u.searchParams.has(key)) {
        u.searchParams.set(key, value)
      }
      return u.href
    }
  } catch {
    return target
  }

  if (relativeUrlHasSearchParam(target, key)) return target
  return appendRelativeSearchParam(target, key, value)
}

function relativeUrlHasSearchParam(target: string, key: string): boolean {
  try {
    return new URL(target, 'https://mvps.local').searchParams.has(key)
  } catch {
    return false
  }
}

function appendRelativeSearchParam(target: string, key: string, value: string): string {
  const hashIndex = target.indexOf('#')
  const pathAndSearch = hashIndex >= 0 ? target.slice(0, hashIndex) : target
  const hash = hashIndex >= 0 ? target.slice(hashIndex) : ''
  const sep = pathAndSearch.includes('?') ? '&' : '?'
  return `${pathAndSearch}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash}`
}

function resolveMarketingTarget(target: string): string {
  const t = target.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) {
    return ensureMvpsMarketingUrl(t)
  }
  const base = resolvePlaywrightBaseUrl()
  const origin = base.endsWith('/') ? base : `${base}/`
  const path = t.startsWith('/') ? t : `/${t}`
  const abs = new URL(path, origin).href
  return ensureMvpsMarketingUrl(abs)
}

export async function gotoMarketingPath(
  page: Page,
  target: string,
  options?: Parameters<Page['goto']>[1]
): Promise<Awaited<ReturnType<Page['goto']>>> {
  return page.goto(resolveMarketingTarget(target), options)
}
