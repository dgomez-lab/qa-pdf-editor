import { test, expect } from '@playwright/test'
import { normalizeEmailForApp } from './emailNormalize'

test.describe('normalizeEmailForApp', () => {
  test('removes underscores from the local part before app email comparisons', () => {
    expect(normalizeEmailForApp('buyer_name@example.com')).toBe('buyername@example.com')
  })

  test('leaves addresses without underscores unchanged', () => {
    expect(normalizeEmailForApp('buyer@example.com')).toBe('buyer@example.com')
  })

  test('leaves values without a domain delimiter unchanged', () => {
    expect(normalizeEmailForApp('buyer_name')).toBe('buyer_name')
  })
})
