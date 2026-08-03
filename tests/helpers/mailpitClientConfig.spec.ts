import { test, expect } from '@playwright/test'
import { isMailpitConfigured } from './mailpitClient'

const ENV_KEYS = [
  'PLAYWRIGHT_MAILPIT_URL',
  'PLAYWRIGHT_MAILPIT_USER',
  'PLAYWRIGHT_MAILPIT_PASSWORD'
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

test.describe('isMailpitConfigured', () => {
  test('requires both user and password even when a custom Mailpit URL is set', () => {
    withEnv(
      {
        PLAYWRIGHT_MAILPIT_URL: 'https://mailpit.example.test/api/v1',
        PLAYWRIGHT_MAILPIT_USER: 'qa-user'
      },
      () => {
        expect(isMailpitConfigured()).toBe(false)
      }
    )
  })

  test('returns true when Basic Auth credentials are present (legacy URL fallback is enough)', () => {
    withEnv(
      {
        PLAYWRIGHT_MAILPIT_USER: 'qa-user',
        PLAYWRIGHT_MAILPIT_PASSWORD: 'qa-pass'
      },
      () => {
        expect(isMailpitConfigured()).toBe(true)
      }
    )
  })

  test('treats blank credentials as unconfigured', () => {
    withEnv(
      {
        PLAYWRIGHT_MAILPIT_URL: 'https://mailpit.example.test/api/v1',
        PLAYWRIGHT_MAILPIT_USER: '  ',
        PLAYWRIGHT_MAILPIT_PASSWORD: '  '
      },
      () => {
        expect(isMailpitConfigured()).toBe(false)
      }
    )
  })
})
