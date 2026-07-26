import { expect, test } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from './resolveBaseUrl'

const ENV_KEYS = [
  'APP',
  'BASE_URL',
  'ENVIRONMENT',
  'GITHUB_ACTIONS',
  'MVPS_SLOT',
  'PDFHINT_BASE_URL',
  'PLAYWRIGHT_APP',
  'QAI_TOKEN_PARAM'
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

test.describe('resolvePlaywrightBaseUrl', () => {
  test('honors explicit BASE_URL and strips trailing slashes', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://custom.example.com///'
      process.env.APP = 'mergedpdf'

      expect(resolvePlaywrightBaseUrl()).toBe('https://custom.example.com')
    } finally {
      restoreEnv(saved)
    }
  })

  test('extracts MVPS QA token from BASE_URL query when unset', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red2.mvps.website/?x-token-qa=secret-token'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')
      expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=secret-token')
    } finally {
      restoreEnv(saved)
    }
  })

  test('does not override an existing QAI_TOKEN_PARAM from MVPS BASE_URL', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website/?x-token-qa=from-url'
      process.env.QAI_TOKEN_PARAM = 'x-token-qa=kept'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
      expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=kept')
    } finally {
      restoreEnv(saved)
    }
  })

  test('defaults to pdfhint staging when APP is unset outside GitHub Actions', () => {
    const saved = resetEnv()
    try {
      expect(resolvePlaywrightBaseUrl()).toBe('https://staging.pdfhint.com')
    } finally {
      restoreEnv(saved)
    }
  })

  test('treats empty APP as mergedpdf under GitHub Actions', () => {
    const saved = resetEnv()
    try {
      process.env.APP = ''
      process.env.PLAYWRIGHT_APP = '   '
      process.env.GITHUB_ACTIONS = 'true'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
    } finally {
      restoreEnv(saved)
    }
  })

  test('builds MVPS host from MVPS_SLOT and ENVIRONMENT', () => {
    const saved = resetEnv()
    try {
      process.env.APP = 'mergedpdf'
      process.env.MVPS_SLOT = '3'
      expect(resolvePlaywrightBaseUrl()).toBe('https://red3.mvps.website')

      process.env.ENVIRONMENT = 'red7'
      expect(resolvePlaywrightBaseUrl()).toBe('https://red7.mvps.website')
    } finally {
      restoreEnv(saved)
    }
  })

  test('accepts mvps alias and pdfhint base URL override', () => {
    const saved = resetEnv()
    try {
      process.env.APP = 'mvps'
      process.env.MVPS_SLOT = '0'
      expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')

      process.env.APP = 'pdfhint'
      process.env.PDFHINT_BASE_URL = 'https://preview.pdfhint.com//'
      expect(resolvePlaywrightBaseUrl()).toBe('https://preview.pdfhint.com')
    } finally {
      restoreEnv(saved)
    }
  })

  test('returns malformed BASE_URL as-is after trimming trailing slashes', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'not a url//'
      expect(resolvePlaywrightBaseUrl()).toBe('not a url')
    } finally {
      restoreEnv(saved)
    }
  })
})
