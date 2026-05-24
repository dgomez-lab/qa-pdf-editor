import { test, expect, type Page } from '@playwright/test'
import { maybeFillStripeBillingForTestIp, stripeBillingForTestIp } from './stripePayment'

type BillingPageOptions = {
  zipVisible?: boolean
  selectOptionRejects?: boolean
}

type BillingState = {
  country: string
  postal: string
  locatorCalls: number
  optionClicked: boolean
  zipVisibilityChecks: number
}

type FakeLocator = {
  first: () => FakeLocator
  waitFor: () => Promise<void>
  isVisible: () => Promise<boolean>
  selectOption: (value: string) => Promise<void>
  click: () => Promise<void>
  fill: (value: string) => Promise<void>
}

function fakeLocator(overrides: Partial<FakeLocator>): FakeLocator {
  const locator: FakeLocator = {
    first: () => locator,
    waitFor: async () => {},
    isVisible: async () => true,
    selectOption: async () => {},
    click: async () => {},
    fill: async () => {},
    ...overrides
  }
  return locator
}

function createBillingPage(options: BillingPageOptions = {}): { page: Page; state: BillingState } {
  const state: BillingState = {
    country: 'ES',
    postal: '28001',
    locatorCalls: 0,
    optionClicked: false,
    zipVisibilityChecks: 0
  }

  const countryLocator = fakeLocator({
    selectOption: async (value: string) => {
      if (options.selectOptionRejects) throw new Error('select failed')
      state.country = value
    }
  })

  const optionLocator = fakeLocator({
    click: async () => {
      state.country = 'US'
      state.optionClicked = true
    }
  })

  const zipLocator = fakeLocator({
    isVisible: async () => {
      state.zipVisibilityChecks += 1
      return options.zipVisible ?? true
    },
    fill: async (value: string) => {
      state.postal = value
    }
  })

  const page = {
    locator: (selector: string) => {
      state.locatorCalls += 1
      if (selector.startsWith('xpath=')) return optionLocator
      if (selector.includes('payment-countryInput')) return countryLocator
      if (selector.includes('payment-postalCodeInput')) return zipLocator
      throw new Error(`Unexpected selector: ${selector}`)
    }
  } as unknown as Page

  return { page, state }
}

test.describe('stripePayment billing by test IP', () => {
  test('maps trimmed US test IP to Stripe billing fields', () => {
    expect(stripeBillingForTestIp(' US ')).toEqual({ country: 'US', postal: '90210' })
  })

  test('does not map empty or unsupported test IP values', () => {
    expect(stripeBillingForTestIp()).toBeUndefined()
    expect(stripeBillingForTestIp('')).toBeUndefined()
    expect(stripeBillingForTestIp('Default')).toBeUndefined()
    expect(stripeBillingForTestIp('ES')).toBeUndefined()
  })

  test('fills country and postal code for visible US billing fields', async () => {
    const { page, state } = createBillingPage()

    await maybeFillStripeBillingForTestIp(page, 'US')

    expect(state.country).toBe('US')
    expect(state.postal).toBe('90210')
    expect(state.zipVisibilityChecks).toBe(1)
  })

  test('falls back to clicking the country option when selectOption fails', async () => {
    const { page, state } = createBillingPage({ selectOptionRejects: true })

    await maybeFillStripeBillingForTestIp(page, 'US')

    expect(state.country).toBe('US')
    expect(state.postal).toBe('90210')
    expect(state.optionClicked).toBe(true)
  })

  test('leaves billing fields unchanged for unsupported test IP values', async () => {
    const { page, state } = createBillingPage()

    await maybeFillStripeBillingForTestIp(page, 'ES')

    expect(state.country).toBe('ES')
    expect(state.postal).toBe('28001')
    expect(state.locatorCalls).toBe(0)
  })

  test('skips US billing when the postal code field is not visible yet', async () => {
    const { page, state } = createBillingPage({ zipVisible: false })

    await maybeFillStripeBillingForTestIp(page, 'US')

    expect(state.country).toBe('ES')
    expect(state.postal).toBe('28001')
    expect(state.zipVisibilityChecks).toBe(1)
  })
})
