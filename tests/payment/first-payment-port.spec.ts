/**
 * Índice histórico. Todos los escenarios de `FirstPayment.feature` están portados en specs dedicados:
 *
 * Pagos por tarjeta (Stripe):
 * - pdfhint/payment-smoke.spec.ts             → @PDFEDITOR_PAYMENT_FIRST_VISA / @PDFEDITOR_PDFHINT_SMOKE_VISA
 * - first-payment-mastercard.spec.ts          → @PDFEDITOR_PAYMENT_FIRST_MASTERCARD
 * - first-payment-amex.spec.ts                → @PDFEDITOR_PAYMENT_FIRST_AMEX
 * - first-payment-discover.spec.ts            → @PDFEDITOR_PAYMENT_FIRST_DISCOVER
 * - first-payment-diners.spec.ts              → @PDFEDITOR_PAYMENT_FIRST_DINERS / _DINNERS
 * - first-payment-jcb.spec.ts                 → @PDFEDITOR_PAYMENT_FIRST_JCB
 * - first-payment-unionpay.spec.ts            → @PDFEDITOR_PAYMENT_FIRST_UNIONPAY
 *
 * Errores de pago:
 * - first-payment-wrong-card.spec.ts          → @PDFEDITOR_PAYMENT_FIRST_WRONG_CARD + _NOT_RECOGNIZED / _HIGH_RISK / _MULTIPLE_DISPUTES
 * - first-payment-insufficient-funds.spec.ts  → @PDFEDITOR_PAYMENT_FIRST_INSUFFICIENT_FUNDS
 * - first-payment-expired-card.spec.ts        → @PDFEDITOR_PAYMENT_FIRST_EXPIRED_CARD
 * - first-payment-lost-card.spec.ts           → @PDFEDITOR_PAYMENT_FIRST_LOST_CARD
 * - first-payment-stolen-card.spec.ts         → @PDFEDITOR_PAYMENT_FIRST_STOLEN_CARD
 * - first-payment-incorrect-cvc.spec.ts       → @PDFEDITOR_PAYMENT_FIRST_INCORRECT_CVC
 *
 * Refunds (CRM):
 * - first-payment-refund-visa.spec.ts         → @PDFEDITOR_PAYMENT_FIRST_REFUND_VISA
 * - first-payment-refund-mastercard.spec.ts   → @PDFEDITOR_PAYMENT_FIRST_REFUND_MASTERCARD
 * - first-payment-refund-amex.spec.ts         → @PDFEDITOR_PAYMENT_FIRST_REFUND_AMEX
 * - first-payment-refund-discover.spec.ts     → @PDFEDITOR_PAYMENT_FIRST_REFUND_DISCOVER
 * - first-payment-refund-dinners.spec.ts      → @PDFEDITOR_PAYMENT_FIRST_REFUND_DINNERS
 * - first-payment-refund-jcb.spec.ts          → @PDFEDITOR_PAYMENT_FIRST_REFUND_JCB
 *
 * Otros:
 * - first-payment-utm.spec.ts                 → 9 tags @PDFEDITOR_PAYMENT_UTM_*
 * - first-payment-ip.spec.ts                  → 5 tags @PDFEDITOR_PAYMENT_IP_*
 * - payment-cancel-by-user.spec.ts            → @PDFEDITOR_PAYMENT_CANCEL_SUBSCRIPTION_BY_USER
 * - payment-cancel-by-agent.spec.ts           → @PDFEDITOR_PAYMENT_CANCEL_SUBSCRIPTION_BY_AGENT
 * - payment-utm-register.spec.ts              → 8 tags @PDFEDITOR_PAYMENT_UTM_REGISTER_*
 */

export {}
