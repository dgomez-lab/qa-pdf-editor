import { test, expect, type Page } from '@playwright/test'
import {
  maybeFillStripeBillingForTestIp,
  stripeBillingForTestIp
} from './stripePayment'

type LocatorTarget = 'country' | 'countryOption' | 'zip'

type LocatorAction =
  | { target: LocatorTarget; name: 'isVisible'; timeout?: number }
  | { target: LocatorTarget; name: 'waitFor'; state?: string; timeout?: number }
  | { target: LocatorTarget; name: 'selectOption'; value: string }
  | { target: LocatorTarget; name: 'click' }
  | { target: LocatorTarget; name: 'fill'; value: string }

type LocatorOptions = {
  selectFails?: boolean
}

class RecordingLocator {
  constructor(
    private readonly target: LocatorTarget,
    private readonly visible: boolean,
    private readonly actions: LocatorAction[],
    private readonly options: LocatorOptions = {}
  ) {}

  first(): RecordingLocator {
    return this
  }

  async isVisible(options?: { timeout?: number }): Promise<boolean> {
    this.actions.push({
      target: this.target,
      name: 'isVisible',
      timeout: options?.timeout
    })
    return this.visible
  }

  async waitFor(options?: { state?: string; timeout?: number }): Promise<void> {
    this.actions.push({
      target: this.target,
      name: 'waitFor',
      state: options?.state,
      timeout: options?.timeout
    })
    if (!this.visible) throw new Error(`${this.target} is not visible`)
  }

  async selectOption(value: string): Promise<void> {
    this.actions.push({ target: this.target, name: 'selectOption', value })
    if (this.options.selectFails) throw new Error('selectOption failed')
  }

  async click(): Promise<void> {
    this.actions.push({ target: this.target, name: 'click' })
  }

  async fill(value: string): Promise<void> {
    this.actions.push({ target: this.target, name: 'fill', value })
  }
}

function createPaymentPage(options: {
  zipVisible?: boolean
  countrySelectFails?: boolean
} = {}): { page: Page; actions: LocatorAction[] } {
  const actions: LocatorAction[] = []
  const country = new RecordingLocator('country', true, actions, {
    selectFails: options.countrySelectFails
  })
  const countryOption = new RecordingLocator('countryOption', true, actions)
  const zip = new RecordingLocator('zip', options.zipVisible ?? true, actions)
  const page = {
    locator(selector: string): RecordingLocator {
      if (selector.startsWith('select#payment-countryInput')) return country
      if (selector.startsWith('xpath=')) return countryOption
      if (selector.includes('postalCode') || selector.includes('payment-zipInput')) return zip
      throw new Error(`Unexpected selector: ${selector}`)
    }
  } as unknown as Page
  return { page, actions }
}

test.describe('stripePayment billing helpers', () => {
  test('maps US test IP to Stripe billing fields', () => {
    expect(stripeBillingForTestIp(' US ')).toEqual({
      country: 'US',
      postal: '90210'
    })
  })

  test('ignores unsupported or blank test IP values', () => {
    expect(stripeBillingForTestIp('ES')).toBeUndefined()
    expect(stripeBillingForTestIp('')).toBeUndefined()
    expect(stripeBillingForTestIp()).toBeUndefined()
  })

  test('fills country and postal code when US postal field is visible', async () => {
    const { page, actions } = createPaymentPage()

    await maybeFillStripeBillingForTestIp(page, 'US')

    expect(actions).toEqual([
      { target: 'zip', name: 'isVisible', timeout: 4000 },
      { target: 'country', name: 'waitFor', state: 'visible', timeout: 20000 },
      { target: 'country', name: 'selectOption', value: 'US' },
      { target: 'zip', name: 'waitFor', state: 'visible', timeout: 20000 },
      { target: 'zip', name: 'fill', value: '90210' }
    ])
  })

  test('does not fill US billing fields before the postal input is visible', async () => {
    const { page, actions } = createPaymentPage({ zipVisible: false })

    await maybeFillStripeBillingForTestIp(page, 'US')

    expect(actions).toEqual([
      { target: 'zip', name: 'isVisible', timeout: 4000 }
    ])
  })

  test('uses the country option fallback when direct selection fails', async () => {
    const { page, actions } = createPaymentPage({ countrySelectFails: true })

    await maybeFillStripeBillingForTestIp(page, 'US')

    expect(actions).toEqual([
      { target: 'zip', name: 'isVisible', timeout: 4000 },
      { target: 'country', name: 'waitFor', state: 'visible', timeout: 20000 },
      { target: 'country', name: 'selectOption', value: 'US' },
      { target: 'country', name: 'click' },
      { target: 'countryOption', name: 'waitFor', state: 'visible', timeout: 10000 },
      { target: 'countryOption', name: 'click' },
      { target: 'zip', name: 'waitFor', state: 'visible', timeout: 20000 },
      { target: 'zip', name: 'fill', value: '90210' }
    ])
  })
})
