/**
 * data-id alineados con qai-pa-pdf-editor `src/pages/contact/elements.json`.
 */
export const contact = {
  firstName: '[data-id="firstNameForm"]',
  lastName: '[data-id="lastNameForm"]',
  email: '[data-id="emailForm"]',
  transactionId: '[data-id="transactionId"]',
  /** `<select>` nativo; valor `unsubscribe` (opción “Unsubscribe Request” en staging). */
  subjectSelect: '[data-id="subjectForm"]',
  message: '[data-id="messageForm"]',
  acceptTerms: '[data-id="acceptTermsCheck"]',
  sendButton: '[data-id="ctaContinueSend"]',
  success: '[data-id="successContact"]'
} as const
