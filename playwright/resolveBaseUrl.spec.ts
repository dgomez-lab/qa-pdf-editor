import { test, expect } from '@playwright/test'
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

function restoreEnv(saved: Record<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function saveEnv(): Record<EnvKey, string | undefined> {
  const saved = {} as Record<EnvKey, string | undefined>
  for (const key of ENV_KEYS) saved[key] = process.env[key]
  return saved
}

function resetEnv(): Record<EnvKey, string | undefined> {
  const saved = saveEnv()
  for (const key of ENV_KEYS) delete process.env[key]
  return saved
}

test.describe('resolvePlaywrightBaseUrl', () => {
  test('strips MVPS query tokens from explicit BASE_URL and stores the QA token parameter', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red.mvps.website?x-token-qa=token-123'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
      expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=token-123')
    } finally {
      restoreEnv(saved)
    }
  })

  test('keeps an existing QA token parameter when explicit MVPS BASE_URL also has a query', () => {
    const saved = resetEnv()
    try {
      process.env.BASE_URL = 'https://red2.mvps.website?x-token-qa=new-token'
      process.env.QAI_TOKEN_PARAM = 'x-token-qa=existing-token'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')
      expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=existing-token')
    } finally {
      restoreEnv(saved)
    }
  })

  test('uses ENVIRONMENT red slug before MVPS_SLOT for mergedpdf', () => {
    const saved = resetEnv()
    try {
      process.env.APP = 'mergedpdf'
      process.env.ENVIRONMENT = 'red3'
      process.env.MVPS_SLOT = '8'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red3.mvps.website')
    } finally {
      restoreEnv(saved)
    }
  })

  test('uses MVPS_SLOT for mergedpdf when ENVIRONMENT is absent', () => {
    const saved = resetEnv()
    try {
      process.env.APP = 'mergedpdf'
      process.env.MVPS_SLOT = '2'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')
    } finally {
      restoreEnv(saved)
    }
  })

  test('defaults empty CI app selection to mergedpdf', () => {
    const saved = resetEnv()
    try {
      process.env.APP = ''
      process.env.GITHUB_ACTIONS = 'true'

      expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
    } finally {
      restoreEnv(saved)
    }
  })

  test('uses pdfhint staging by default and honors PDFHINT_BASE_URL overrides', () => {
    const saved = resetEnv()
    try {
      expect(resolvePlaywrightBaseUrl()).toBe('https://staging.pdfhint.com')

      process.env.PDFHINT_BASE_URL = 'https://preview.pdfhint.com///'
      expect(resolvePlaywrightBaseUrl()).toBe('https://preview.pdfhint.com')
    } finally {
      restoreEnv(saved)
    }
  })
})
