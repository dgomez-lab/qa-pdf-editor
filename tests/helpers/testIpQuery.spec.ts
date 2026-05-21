import { test, expect } from '@playwright/test'
import { homeQueryFromTestData, resolveDefaultTestIp } from './testIpQuery'

test.describe('testIpQuery', () => {
  test('returns explicit ip from scenario data', () => {
    expect(homeQueryFromTestData({ ip: 'US' })).toEqual({ ip: 'US' })
  })

  test('uses PLAYWRIGHT_DEFAULT_TEST_IP when ip is Default', () => {
    const prev = process.env.PLAYWRIGHT_DEFAULT_TEST_IP
    const prevCi = process.env.CI
    delete process.env.CI
    process.env.PLAYWRIGHT_DEFAULT_TEST_IP = 'ES'
    try {
      expect(homeQueryFromTestData({ ip: 'Default' })).toEqual({ ip: 'ES' })
      expect(homeQueryFromTestData({})).toEqual({ ip: 'ES' })
    } finally {
      if (prev === undefined) delete process.env.PLAYWRIGHT_DEFAULT_TEST_IP
      else process.env.PLAYWRIGHT_DEFAULT_TEST_IP = prev
      if (prevCi === undefined) delete process.env.CI
      else process.env.CI = prevCi
    }
  })

  test('CI without env still defaults to ES', () => {
    const prev = process.env.PLAYWRIGHT_DEFAULT_TEST_IP
    const prevCi = process.env.CI
    delete process.env.PLAYWRIGHT_DEFAULT_TEST_IP
    process.env.CI = 'true'
    try {
      expect(resolveDefaultTestIp()).toBe('ES')
    } finally {
      if (prev === undefined) delete process.env.PLAYWRIGHT_DEFAULT_TEST_IP
      else process.env.PLAYWRIGHT_DEFAULT_TEST_IP = prev
      if (prevCi === undefined) delete process.env.CI
      else process.env.CI = prevCi
    }
  })
})
