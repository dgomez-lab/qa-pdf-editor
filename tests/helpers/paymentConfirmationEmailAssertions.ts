import { expect } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'

/** Aserciones laxas: correo post-pago suele incluir enlace https y asunto no vacío. */
export function assertPaymentConfirmationEmailLoose(detail: MailpitMessageDetail): void {
  expect(detail.Subject?.trim(), 'asunto del correo de confirmación').toBeTruthy()
  const blob = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`
  expect(blob, 'cuerpo con al menos un enlace https').toMatch(/https:\/\//i)
}
