import type { DataTable } from 'playwright-bdd'
import { Given } from '../fixtures'
import { mergeTestDataFromTable } from '../bddTestData'
import { sampleSuccessPaymentCardName } from '../stripeTestCards'
import type { BddWorld } from '../fixtures'

Given('I set this test to start with the following data:', async ({ bddWorld }, table: DataTable) => {
  mergeTestDataFromTable(bddWorld as BddWorld, table)
})

Given('I set a random success payment card', async ({ bddWorld }) => {
  const card = sampleSuccessPaymentCardName()
  ;(bddWorld as BddWorld).testData.card = card
})
