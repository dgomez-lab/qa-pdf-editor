/**
 * Selectores alineados con qai-pa-pdf-editor/src/pages/editor/elements.json
 * y home/elements.json (flujo Direct + upload).
 */
export const editor = {
  uploadLoader: '.line-loader, [class*="LinearLoader"]',
  uploadDocumentButton: '[data-id="ctaUploadDocument"]',
  downloadButton: '[data-id="download"]',
  loadingOverlay: "//*[contains(normalize-space(.),'Loading, please wait')]",
  emailInput: '[data-id="emailForm"]',
  downloadLoginButton: '[data-id="loginBtnSubmit"]',
  closeModalButton: '[data-id="ctaCloseModal"]',
  payWithCardButton: "//button[@type='button'][.//img[contains(@src,'/icons/checkout-flow/card.svg')] or contains(translate(.,'PAY WITH CARD','pay with card'),'pay with card')]",
  stripePaymentIframe: "iframe[src*='componentName=payment'], iframe[src*='elements-inner-payment'], iframe[title='Secure payment input frame']",
  /** Contenedor Stripe Elements (legacy + varias versiones). */
  paymentElementHost: '#payment-element, [data-testid="payment-element"], [id="payment-element"]',
  /** Cualquier iframe de js.stripe.com (fallback). */
  stripeIframeLoose: 'iframe[src*="js.stripe.com"], iframe[src*="hooks.stripe.com"]',
  stripeCardNumberIframe: "iframe[src*='componentName=cardNumber'], iframe[src*='elements-inner-card'], iframe[title*='card number']",
  stripeExpiryIframe: "iframe[src*='componentName=cardExpiry'], iframe[title*='expiration']",
  stripeCvcIframe: "iframe[src*='componentName=cardCvc'], iframe[title*='CVC']",
  cardNumberUnified: "input[name='number'], #payment-numberInput",
  expiryUnified: "input[name='expiry'], #payment-expiryInput",
  cvcUnified: "input[name='cvc'], #payment-cvcInput",
  cardNumberSplit: "input[name='cardnumber']",
  expirySplit: "input[name='exp-date']",
  cvcSplit: "input[name='cvc']",
  continuePayment: '[data-id="confirm-payment-button"]',
  /**
   * Tras pago exitoso: modal `SelectFormatModal` — mismo xpath que legacy
   * `payment success download button` (varias `data-id` por idioma + ContinueButton).
   */
  paymentSuccessDownloadButton:
    "//div[contains(@class,'SelectFormatModal')]//button[@data-id='download' or @data-id='descargar' or @data-id='télécharger' or @data-id='scarica' or @data-id='baixar' or @data-id='herunterladen' or @data-id='ダウンロード' or @data-id='pobierz' or @data-id='i̇ndir' or @data-id='تنزيل' or @data-id='downloaden' or @data-id='다운로드' or contains(@class,'ContinueButton')]"
} as const

export const home = {
  /** Legacy mergedpdf: .dropzone > input. Marketing pdfhint (Astro): input.co-upload-hitlayer. */
  fileInput:
    'main input[type="file"].co-upload-hitlayer, main input[type="file"][aria-label*="Upload"], .dropzone > input'
} as const
