import { test, expect } from '@playwright/test'
import { accountSelectors } from './accountActions'

test.describe('accountSelectors dual data-id fallbacks', () => {
  test('membership and active status accept both staging and legacy ids', () => {
    expect(accountSelectors.membershipLink).toContain('[data-id="sidebarMembershipLink"]')
    expect(accountSelectors.membershipLink).toContain('[data-id="membershipLink"]')
    expect(accountSelectors.activeStatus).toContain('[data-id="statusActive"]')
    expect(accountSelectors.activeStatus).toContain('[data-id="activeStatus"]')
  })

  test('cancel/confirm unsubscribe accept both staging and legacy ids', () => {
    expect(accountSelectors.cancelSubscriptionLink).toBe('[data-id="cancelSubscription"]')
    expect(accountSelectors.yesUnsubscribeButton).toContain('[data-id="unsubscribeAccount"]')
    expect(accountSelectors.yesUnsubscribeButton).toContain('[data-id="yesUnsubscribe"]')
  })

  test('transaction price texts accept Account-suffixed and legacy ids', () => {
    expect(accountSelectors.transactionPriceText).toContain('[data-id="transactionPriceAccount"]')
    expect(accountSelectors.transactionPriceText).toContain('[data-id="transactionPrice"]')
    expect(accountSelectors.transactionMonthlyPriceText).toContain(
      '[data-id="transactionMonthlyPriceAccount"]'
    )
    expect(accountSelectors.transactionMonthlyPriceText).toContain(
      '[data-id="transactionMonthlyPrice"]'
    )
  })
})
