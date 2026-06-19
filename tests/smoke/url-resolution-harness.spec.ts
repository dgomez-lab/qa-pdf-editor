import { test, expect } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'
import { ensureMvpsMarketingUrl } from '../helpers/mvpsUrl'

const ENV_KEYS = [
  'APP',
  'PLAYWRIGHT_APP',
  'BASE_URL',
  'PDFHINT_BASE_URL',
  'GITHUB_ACTIONS',
  'MVPS_SLOT',
  'ENVIRONMENT',
  'QAI_TOKEN_PARAM',
  'APPEND_QA_TOKEN'
] as const

type EnvKey = typeof ENV_KEYS[number]

let originalEnv: Partial<Record<EnvKey, string>>

function unsetHarnessEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
}

function restoreHarnessEnv(): void {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

test.describe('Smoke - harness URL resolution', { tag: ['@PDFEDITOR_SMOKE', '@PDFEDITOR_HARNESS'] }, () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    originalEnv = {}
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key]
    }
    unsetHarnessEnv()
  })

  test.afterEach(() => {
    restoreHarnessEnv()
  })

  test('empty app variables default to MVPS only in GitHub Actions', { tag: ['@PDFEDITOR_HARNESS_BASE_URL'] }, () => {
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = ' '

    expect(resolvePlaywrightBaseUrl()).toBe('https://staging.pdfhint.com')

    process.env.GITHUB_ACTIONS = 'true'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
  })

  test('PLAYWRIGHT_APP and MVPS slot values resolve deterministic hosts', { tag: ['@PDFEDITOR_HARNESS_BASE_URL'] }, () => {
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = 'mergedpdf'
    process.env.MVPS_SLOT = '2'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')

    process.env.MVPS_SLOT = 'red3'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red3.mvps.website')

    process.env.ENVIRONMENT = 'red4'
    process.env.MVPS_SLOT = '2'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red4.mvps.website')

    process.env.ENVIRONMENT = ''
    process.env.MVPS_SLOT = 'not-a-slot'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
  })

  test('explicit MVPS BASE_URL strips query and captures the QA token once', { tag: ['@PDFEDITOR_HARNESS_BASE_URL'] }, () => {
    process.env.BASE_URL = 'https://red2.mvps.website/?x-token-qa=from-base'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-base')

    process.env.BASE_URL = 'https://red3.mvps.website/?x-token-qa=ignored'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red3.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-base')
  })

  test('MVPS marketing URLs receive the QA token without changing other hosts', { tag: ['@PDFEDITOR_HARNESS_MVPS_URL'] }, () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=secret'

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms?x-token-qa=secret')
    expect(ensureMvpsMarketingUrl('/forms?utm_source=qa')).toBe('/forms?utm_source=qa&x-token-qa=secret')
    expect(ensureMvpsMarketingUrl('https://red.mvps.website/forms?utm_source=qa')).toBe(
      'https://red.mvps.website/forms?utm_source=qa&x-token-qa=secret'
    )
    expect(ensureMvpsMarketingUrl('https://example.com/forms')).toBe('https://example.com/forms')
    expect(ensureMvpsMarketingUrl('/forms?x-token-qa=existing')).toBe('/forms?x-token-qa=existing')
  })

  test('MVPS QA token appending can be disabled explicitly', { tag: ['@PDFEDITOR_HARNESS_MVPS_URL'] }, () => {
    process.env.BASE_URL = 'https://red.mvps.website'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=secret'
    process.env.APPEND_QA_TOKEN = 'false'

    expect(ensureMvpsMarketingUrl('/forms')).toBe('/forms')
  })
})
