import { test, expect } from '@playwright/test'
import { forceWrongUrlTarget, mergeUrlParameters } from './forceUrlParams'

test.describe('forceUrlParams URL helpers', () => {
  test('merges and replaces query params on the current URL', () => {
    const next = mergeUrlParameters('https://red.mvps.website/en?ip=US&keep=1', {
      ip: 'ES',
      lang: 'en'
    })
    const u = new URL(next)
    expect(u.origin + u.pathname).toBe('https://red.mvps.website/en')
    expect(u.searchParams.get('ip')).toBe('ES')
    expect(u.searchParams.get('keep')).toBe('1')
    expect(u.searchParams.get('lang')).toBe('en')
  })

  test('skips empty and nullish values like legacy BotPage', () => {
    const next = mergeUrlParameters('https://staging.pdfhint.com/', {
      ip: 'GB',
      empty: '',
      blank: null as unknown as string
    })
    const u = new URL(next)
    expect(u.searchParams.get('ip')).toBe('GB')
    expect(u.searchParams.has('empty')).toBe(false)
    expect(u.searchParams.has('blank')).toBe(false)
  })

  test('forceWrongUrlTarget replaces path with the shared 404 route', () => {
    expect(forceWrongUrlTarget('https://red.mvps.website/en/account?x-token-qa=abc')).toBe(
      'https://red.mvps.website/this-route-does-not-exist'
    )
  })
})
