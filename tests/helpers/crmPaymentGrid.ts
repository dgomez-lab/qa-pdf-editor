export const CRM_TRANSACTION_COLUMNS = {
  orderId: 1,
  createdAt: 2,
  requestedPaymentDate: 3,
  paymentDate: 4,
  transactionType: 5,
  transactionStatus: 6,
  amount: 7,
  currency: 8,
  transactionId: 9,
  paymentSolution: 10,
  cardType: 12,
  subscriptionName: 17
} as const

export type CrmPaymentGridField = keyof typeof CRM_TRANSACTION_COLUMNS

export function cellAt(cells: string[], columnNth: number): string {
  return (cells[columnNth - 1] ?? '').trim()
}

export type LastPaymentRowRecord = {
  transactionType: string
  transactionStatus: string
  paymentSolution: string
  cardType?: string
  amount: string
  currency: string
  subscriptionName: string
}

export function paymentRecordFromCells(
  cells: string[],
  kind: 'first transaction' | 'refund' | 'recurrency'
): LastPaymentRowRecord {
  const out: LastPaymentRowRecord = {
    transactionType: cellAt(cells, CRM_TRANSACTION_COLUMNS.transactionType),
    transactionStatus: cellAt(cells, CRM_TRANSACTION_COLUMNS.transactionStatus),
    amount: cellAt(cells, CRM_TRANSACTION_COLUMNS.amount),
    currency: cellAt(cells, CRM_TRANSACTION_COLUMNS.currency),
    paymentSolution: cellAt(cells, CRM_TRANSACTION_COLUMNS.paymentSolution),
    subscriptionName: cellAt(cells, CRM_TRANSACTION_COLUMNS.subscriptionName)
  }
  if (kind !== 'refund') {
    out.cardType = cellAt(cells, CRM_TRANSACTION_COLUMNS.cardType)
  }
  return out
}

export function paymentDateColumnsZeroBased(): number[] {
  return [
    CRM_TRANSACTION_COLUMNS.createdAt - 1,
    CRM_TRANSACTION_COLUMNS.requestedPaymentDate - 1,
    CRM_TRANSACTION_COLUMNS.paymentDate - 1
  ]
}
