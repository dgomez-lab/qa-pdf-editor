import { test, expect } from '@playwright/test'
import {
  buildPayRecurrenceBody,
  isAcceptableRecurrenceHttpFailure,
  qaApiHeaders,
  resolveRecurrenceApiBaseUrl,
  stripQueryAndTrailing
} from './recurrencesApi'

const ENV_KEYS = [
  'PLAYWRIGHT_RECURRENCE_API_BASE_URL',
  'PLAYWRIGHT_QA_API_KEY',
  'BASE_URL',
  'APP',
  'PLAYWRIGHT_APP',
  'PDFHINT_APP_BASE_URL',
  'PDFHINT_BASE_URL',
  'GITHUB_ACTIONS',
  'ENVIRONMENT',
  'MVPS_SLOT',
  'QAI_TOKEN_PARAM'
] as const

function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) {
    prev[key] = process.env[key]
    delete process.env[key]
  }
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    fn()
  } finally {
    for (const key of ENV_KEYS) {
      if (prev[key] === undefined) delete process.env[key]
      else process.env[key] = prev[key]
    }
  }
}

test.describe('recurrencesApi URL and payload helpers', () => {
  test('stripQueryAndTrailing drops query and trailing slashes', () => {
    expect(stripQueryAndTrailing('https://app.staging.pdfhint.com/?x=1')).toBe(
      'https://app.staging.pdfhint.com'
    )
    expect(stripQueryAndTrailing('https://red.mvps.website///')).toBe('https://red.mvps.website')
  })

  test('explicit PLAYWRIGHT_RECURRENCE_API_BASE_URL wins and is normalized', () => {
    withEnv(
      {
        PLAYWRIGHT_RECURRENCE_API_BASE_URL: 'https://qa.example.com/api/?token=1',
        BASE_URL: 'https://staging.pdfhint.com'
      },
      () => {
        expect(resolveRecurrenceApiBaseUrl()).toBe('https://qa.example.com/api')
      }
    )
  })

  test('pdfhint marketing BASE_URL maps recurrence API to app host', () => {
    withEnv({ BASE_URL: 'https://staging.pdfhint.com', APP: 'pdfhint' }, () => {
      expect(resolveRecurrenceApiBaseUrl()).toBe('https://app.staging.pdfhint.com')
    })
  })

  test('MVPS BASE_URL keeps the same host for recurrence API', () => {
    withEnv({ BASE_URL: 'https://red.mvps.website?x-token-qa=secret', APP: 'mergedpdf' }, () => {
      expect(resolveRecurrenceApiBaseUrl()).toBe('https://red.mvps.website')
    })
  })

  test('qaApiHeaders uses legacy default and env override', () => {
    withEnv({}, () => {
      expect(qaApiHeaders()['X-API-KEY']).toBe('t0k3nS3vr3t')
    })
    withEnv({ PLAYWRIGHT_QA_API_KEY: '  custom-key  ' }, () => {
      expect(qaApiHeaders()['X-API-KEY']).toBe('custom-key')
    })
  })

  test('buildPayRecurrenceBody maps success/soft/hard and numeric ids', () => {
    expect(buildPayRecurrenceBody('42', 'success')).toEqual({ test: '1', subscriptionId: 42 })
    expect(buildPayRecurrenceBody(7, 'soft')).toEqual({
      test: '1',
      subscriptionId: 7,
      errorType: 'soft'
    })
    expect(buildPayRecurrenceBody('abc', 'hard')).toEqual({
      test: '1',
      subscriptionId: 'abc',
      errorType: 'hard'
    })
  })

  test('hard recurrence treats HTTP 400 as acceptable failure', () => {
    expect(isAcceptableRecurrenceHttpFailure('hard', 400)).toBe(true)
    expect(isAcceptableRecurrenceHttpFailure('hard', 500)).toBe(false)
    expect(isAcceptableRecurrenceHttpFailure('soft', 400)).toBe(false)
    expect(isAcceptableRecurrenceHttpFailure('success', 400)).toBe(false)
  })
})
