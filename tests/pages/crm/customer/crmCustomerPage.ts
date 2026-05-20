import type { Page } from '@playwright/test'
import * as crmStaging from '../../../helpers/crmStaging'
import { crmCustomer } from '../crmSelectors'

export class CrmCustomerPage {
  constructor(private readonly page: Page) {}

  subscriptionStatusLocator(): ReturnType<Page['locator']> {
    return this.page.locator(crmCustomer.customerSubscriptionStatus)
  }

  async refundLastPayment(): Promise<void> {
    await crmStaging.refundLastPaymentLikeLegacy(this.page)
  }

  async unsubscribeCustomer(): Promise<void> {
    await crmStaging.unsubscribeCustomer(this.page)
  }
}
