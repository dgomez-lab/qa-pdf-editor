import { test, expect } from '@playwright/test'
import { appUrl, isPdfhintApp, resolveAppBaseUrl } from './appUrl'

const ENV_KEYS = [
  'APP',
  'BASE_URL',
  'GITHUB_ACTIONS',
  'PDFHINT_APP_BASE_URL',
  'PDFHINT_BASE_URL',
  'PLAYWRIGHT_APP'
] as const

type EnvKey = (typeof ENV_KEYS)[number]

function saveEnv(): Record<EnvKey, string | undefined> {
  const saved = {} as Record<EnvKey, string | undefined>
  for (const key of ENV_KEYS) saved[key] = process.env[key]
  return saved
}

function restoreEnv(saved: Record<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function resetEnv(): Record<EnvKey, string | undefined> {
  const saved = saveEnv()
  for (const key of ENV_KEYS) delete process.env[key]
  return saved
}

test.describe('appUrl pdfhint host mapping', () => {
  test('honors PDFHINT_APP_BASE_URL override and strips trailing slashes', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://staging.pdfhint.com'
      process.env.PDFHINT_APP_BASE_URL = 'https://custom.app.pdfhint.com///'

      expect(resolveAppBaseUrl()).toBe('https://custom.app.pdfhint.com')
      expect(appUrl('/en/login')).toBe('https://custom.app.pdfhint.com/en/login')
    } finally {
      restoreEnv(saved)
    }
  })

  test('maps marketing pdfhint hosts to app.* for authenticated paths', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://staging.pdfhint.com/'

      expect(isPdfhintApp()).toBe(true)
      expect(resolveAppBaseUrl()).toBe('https://app.staging.pdfhint.com')
      expect(appUrl('dashboard')).toBe('https://app.staging.pdfhint.com/dashboard')
      expect(appUrl('/account')).toBe('https://app.staging.pdfhint.com/account')
    } finally {
      restoreEnv(saved)
    }
  })

  test('keeps an existing app.pdfhint host unchanged', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://app.pdfhint.com/'

      expect(resolveAppBaseUrl()).toBe('https://app.pdfhint.com')
      expect(appUrl('/settings')).toBe('https://app.pdfhint.com/settings')
    } finally {
      restoreEnv(saved)
    }
  })

  test('returns relative paths on non-pdfhint hosts such as MVPS', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website'

      expect(isPdfhintApp()).toBe(false)
      expect(resolveAppBaseUrl()).toBe('https://red.mvps.website')
      expect(appUrl('/en/login')).toBe('/en/login')
      expect(appUrl('dashboard')).toBe('/dashboard')
    } finally {
      restoreEnv(saved)
    }
  })

  test('falls back safely when BASE_URL is not a valid absolute URL', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'not a url'

      expect(isPdfhintApp()).toBe(false)
      expect(resolveAppBaseUrl()).toBe('not a url')
      expect(appUrl('/login')).toBe('/login')
    } finally {
      restoreEnv(saved)
    }
  })

  test('keeps relative app paths on MVPS even when PDFHINT_APP_BASE_URL is set', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website'
      process.env.PDFHINT_APP_BASE_URL = 'https://app.staging.pdfhint.com'

      expect(isPdfhintApp()).toBe(false)
      expect(resolveAppBaseUrl()).toBe('https://app.staging.pdfhint.com')
      expect(appUrl('/en/login')).toBe('/en/login')
    } finally {
      restoreEnv(saved)
    }
  })
})
