import { expect, test } from '@playwright/test'
import { resolveCiRetries, resolveCiWorkers } from './runnerOptions'

test.describe('CI runner options', () => {
  test('defaults retries for missing or malformed values', () => {
    expect(resolveCiRetries(undefined)).toBe(1)
    expect(resolveCiRetries('not-a-number')).toBe(1)
  })

  test('normalizes configured retries to a non-negative integer', () => {
    expect(resolveCiRetries('-2')).toBe(0)
    expect(resolveCiRetries('2.9')).toBe(2)
    expect(resolveCiRetries('')).toBe(0)
  })

  test('defaults workers for missing, malformed, or out-of-range values', () => {
    expect(resolveCiWorkers(undefined)).toBe(2)
    expect(resolveCiWorkers('not-a-number')).toBe(2)
    expect(resolveCiWorkers('0')).toBe(2)
    expect(resolveCiWorkers('-3')).toBe(2)
  })

  test('normalizes configured workers to a positive integer', () => {
    expect(resolveCiWorkers('1')).toBe(1)
    expect(resolveCiWorkers('3.9')).toBe(3)
  })
})
