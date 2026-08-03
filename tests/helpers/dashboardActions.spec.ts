import { test, expect } from '@playwright/test'
import { authenticatedAppPath } from './dashboardActions'

const ENV_KEYS = [
  'APP',
  'BASE_URL',
  'GITHUB_ACTIONS',
  'PDFHINT_APP_BASE_URL',
  'PDFHINT_BASE_URL',
  'PLAYWRIGHT_APP'
] as const

type EnvKey = (typeof ENV_KEYS)[number]

function withEnv(vars: Partial<Record<EnvKey, string | undefined>>, run: () => void): void {
  const previous: Record<EnvKey, string | undefined> = {} as Record<EnvKey, string | undefined>
  for (const key of ENV_KEYS) {
    previous[key] = process.env[key]
    if (!(key in vars)) delete process.env[key]
    else if (vars[key] === undefined) delete process.env[key]
    else process.env[key] = vars[key]
  }
  try {
    run()
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
}

test.describe('authenticatedAppPath', () => {
  test('uses localized /en/* paths on pdfhint hosts', () => {
    withEnv({ BASE_URL: 'https://staging.pdfhint.com' }, () => {
      expect(authenticatedAppPath('dashboard')).toBe('/en/dashboard')
      expect(authenticatedAppPath('account')).toBe('/en/account')
      expect(authenticatedAppPath('login')).toBe('/en/login')
    })
  })

  test('keeps unprefixed paths on MVPS / non-pdfhint hosts', () => {
    withEnv({ BASE_URL: 'https://red.mvps.website' }, () => {
      expect(authenticatedAppPath('dashboard')).toBe('/dashboard')
      expect(authenticatedAppPath('account')).toBe('/account')
      expect(authenticatedAppPath('login')).toBe('/login')
    })
  })
})
