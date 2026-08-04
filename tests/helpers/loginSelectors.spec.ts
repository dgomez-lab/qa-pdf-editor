import { test, expect } from '@playwright/test'
import { loginSelectors } from './loginFlow'

test.describe('loginSelectors', () => {
  test('keeps legacy data-id contracts used by magic-link login flows', () => {
    expect(loginSelectors.emailForm).toBe('[data-id="emailForm"]')
    expect(loginSelectors.loginSubmit).toBe('[data-id="loginBtnSubmit"]')
    expect(loginSelectors.loginCtaButton).toBe('[data-id="loginCtaButton"]')
    expect(loginSelectors.blockedUserMessage).toBe('[data-id="blockedUserMessage"]')
  })
})
