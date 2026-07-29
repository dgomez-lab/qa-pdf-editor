import { expect, test } from '@playwright/test'
import { resolveCrmStartUrl } from './crmStaging'

const ENV_KEYS = ['PLAYWRIGHT_CRM_BASE_URL', 'ENVIRONMENT', 'MVPS_SLOT', 'QAI_TOKEN_PARAM'] as const

function withEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>, run: () => void): void {
  const previous: Record<string, string | undefined> = {}
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

test.describe('resolveCrmStartUrl', () => {
  test('prefers PLAYWRIGHT_CRM_BASE_URL and strips trailing slashes', () => {
    withEnv(
      {
        PLAYWRIGHT_CRM_BASE_URL: 'https://crm-custom.example/?token=abc///',
        ENVIRONMENT: 'red9',
        MVPS_SLOT: '2'
      },
      () => {
        expect(resolveCrmStartUrl()).toBe('https://crm-custom.example/?token=abc')
      }
    )
  })

  test('maps ENVIRONMENT redN hosts ahead of MVPS_SLOT', () => {
    withEnv(
      {
        ENVIRONMENT: 'RED12',
        MVPS_SLOT: '3',
        QAI_TOKEN_PARAM: 'x-token-qa=fixture-token'
      },
      () => {
        expect(resolveCrmStartUrl()).toBe('https://crm-red12.mvps.website/?x-token-qa=fixture-token')
      }
    )
  })

  test('builds CRM host from numeric MVPS_SLOT when ENVIRONMENT is not redN', () => {
    withEnv(
      {
        ENVIRONMENT: 'staging',
        MVPS_SLOT: '4',
        QAI_TOKEN_PARAM: 'x-token-qa=slot-token'
      },
      () => {
        expect(resolveCrmStartUrl()).toBe('https://crm-red4.mvps.website/?x-token-qa=slot-token')
      }
    )
  })

  test('accepts red-prefixed MVPS_SLOT values', () => {
    withEnv(
      {
        MVPS_SLOT: 'Red7',
        QAI_TOKEN_PARAM: 'x-token-qa=slot-token'
      },
      () => {
        expect(resolveCrmStartUrl()).toBe('https://crm-red7.mvps.website/?x-token-qa=slot-token')
      }
    )
  })

  test('defaults to crm.mvps.website for slot 0 or missing slot', () => {
    withEnv({ MVPS_SLOT: '0', QAI_TOKEN_PARAM: 'x-token-qa=default-slot' }, () => {
      expect(resolveCrmStartUrl()).toBe('https://crm.mvps.website/?x-token-qa=default-slot')
    })
    withEnv({ QAI_TOKEN_PARAM: 'x-token-qa=default-slot' }, () => {
      expect(resolveCrmStartUrl()).toBe('https://crm.mvps.website/?x-token-qa=default-slot')
    })
  })

  test('falls back to the legacy QA token query when QAI_TOKEN_PARAM is unset', () => {
    withEnv({}, () => {
      expect(resolveCrmStartUrl()).toBe('https://crm.mvps.website/?x-token-qa=niGqCYH7McqERAB')
    })
  })
})
