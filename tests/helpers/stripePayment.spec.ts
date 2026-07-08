import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fillStripePaymentLikeLegacy } from './stripePayment'
import { editor } from '../pages/editorSelectors'

type Action = {
  type: 'click' | 'fill' | 'select' | 'waitFor'
  selector: string
  value?: string
}

class FakeLocator {
  constructor(
    private readonly selector: string,
    private readonly actions: Action[],
    private readonly visibleSelector: (selector: string) => boolean
  ) {}

  first(): FakeLocator {
    return this
  }

  async isVisible(): Promise<boolean> {
    return this.visibleSelector(this.selector)
  }

  async click(): Promise<void> {
    this.actions.push({ type: 'click', selector: this.selector })
  }

  async fill(value: string): Promise<void> {
    this.actions.push({ type: 'fill', selector: this.selector, value })
  }

  async selectOption(value: string): Promise<void> {
    this.actions.push({ type: 'select', selector: this.selector, value })
  }

  async waitFor(): Promise<void> {
    this.actions.push({ type: 'waitFor', selector: this.selector })
  }

  frameLocator(selector: string): FakeFrameLocator {
    return new FakeFrameLocator(`${this.selector} >> ${selector}`, this.actions, this.visibleSelector)
  }
}

class FakeFrameLocator {
  constructor(
    private readonly prefix: string,
    private readonly actions: Action[],
    private readonly visibleSelector: (selector: string) => boolean
  ) {}

  locator(selector: string): FakeLocator {
    return new FakeLocator(`${this.prefix} >> ${selector}`, this.actions, this.visibleSelector)
  }
}

class FakeStripePage {
  readonly actions: Action[] = []

  constructor(private readonly options: { postalVisible: boolean } = { postalVisible: true }) {}

  locator(selector: string): FakeLocator {
    return new FakeLocator(selector, this.actions, (candidate) => this.isVisible(candidate))
  }

  getByRole(): FakeLocator {
    return this.locator('role=button')
  }

  frameLocator(selector: string): FakeFrameLocator {
    return new FakeFrameLocator(`frame(${selector})`, this.actions, (candidate) => this.isVisible(candidate))
  }

  frames(): never[] {
    return []
  }

  mainFrame(): null {
    return null
  }

  async waitForTimeout(): Promise<void> {}

  private isVisible(selector: string): boolean {
    if (selector === editor.payWithCardButton) return true
    if (selector === editor.stripePaymentIframe) return true
    if (selector.includes("input[name='number']")) return true
    if (selector.includes("input[name='expiry']")) return true
    if (selector.includes("input[name='cvc']")) return true
    if (selector.includes('payment-postalCodeInput')) return this.options.postalVisible
    return false
  }
}

function fillValues(actions: Action[]): (string | undefined)[] {
  return actions.filter((a) => a.type === 'fill').map((a) => a.value)
}

test.describe('fillStripePaymentLikeLegacy billing by test IP', () => {
  test('fills US billing country and postal code after card fields', async () => {
    const page = new FakeStripePage()

    await fillStripePaymentLikeLegacy(
      page as unknown as Page,
      { number: '4242424242424242', exp: '1234', cvc: '123' },
      { testIp: ' US ' }
    )

    expect(fillValues(page.actions)).toEqual(['4242424242424242', '1234', '123', '90210'])
    expect(page.actions).toContainEqual({
      type: 'select',
      selector: "select#payment-countryInput, select[name='country']",
      value: 'US'
    })
  })

  test('does not touch billing fields for unsupported test IPs', async () => {
    const page = new FakeStripePage()

    await fillStripePaymentLikeLegacy(
      page as unknown as Page,
      { number: '4242424242424242', exp: '1234', cvc: '123' },
      { testIp: 'ES' }
    )

    expect(fillValues(page.actions)).toEqual(['4242424242424242', '1234', '123'])
    expect(page.actions.filter((a) => a.type === 'select')).toEqual([])
  })

  test('skips US billing when postal code input is absent', async () => {
    const page = new FakeStripePage({ postalVisible: false })

    await fillStripePaymentLikeLegacy(
      page as unknown as Page,
      { number: '4242424242424242', exp: '1234', cvc: '123' },
      { testIp: 'US' }
    )

    expect(fillValues(page.actions)).toEqual(['4242424242424242', '1234', '123'])
    expect(page.actions.filter((a) => a.type === 'select')).toEqual([])
  })
})
