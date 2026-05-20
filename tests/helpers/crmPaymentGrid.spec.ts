import { test, expect } from '@playwright/test'
import {
  CRM_TRANSACTION_COLUMNS,
  cellAt,
  paymentRecordFromCells,
  paymentDateColumnsZeroBased
} from './crmPaymentGrid'

test.describe('CRM payment grid column mapping (legacy CrmCustomerPage)', () => {
  test('cardType uses nth-of-type 12 not 11', () => {
    const cells = Array.from({ length: 18 }, () => '')
    cells[10] = 'Mid Stripe Luxor'
    cells[11] = 'credit'
    expect(cellAt(cells, CRM_TRANSACTION_COLUMNS.cardType)).toBe('credit')
    expect(cellAt(cells, 11)).toBe('Mid Stripe Luxor')
  })

  test('paymentRecordFromCells matches legacy extractLastPaymentData indices', () => {
    const cells = Array.from({ length: 18 }, () => '')
    cells[4] = 'Payment'
    cells[5] = 'Success'
    cells[6] = '1.95'
    cells[7] = 'EUR'
    cells[9] = 'Stripe'
    cells[11] = 'credit'
    cells[16] = 'Full Access'
    const record = paymentRecordFromCells(cells, 'first transaction')
    expect(record).toEqual({
      transactionType: 'Payment',
      transactionStatus: 'Success',
      amount: '1.95',
      currency: 'EUR',
      paymentSolution: 'Stripe',
      cardType: 'credit',
      subscriptionName: 'Full Access'
    })
  })

  test('refund record omits cardType', () => {
    const cells = Array.from({ length: 18 }, () => '')
    cells[4] = 'Refund'
    cells[11] = 'credit'
    const record = paymentRecordFromCells(cells, 'refund')
    expect(record.cardType).toBeUndefined()
  })

  test('date columns are 2, 3, 4 (zero-based 1, 2, 3)', () => {
    expect(paymentDateColumnsZeroBased()).toEqual([1, 2, 3])
  })
})
