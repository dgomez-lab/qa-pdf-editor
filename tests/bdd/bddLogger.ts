type LogLevel = 'SILENT' | 'INFO' | 'DEBUG'

function resolveLevel(): LogLevel {
  const explicit = process.env.BDD_LOG_LEVEL?.trim()
  if (explicit) {
    const v = explicit.toUpperCase()
    if (v === 'DEBUG') return 'DEBUG'
    if (v === 'SILENT' || v === 'OFF' || v === '0') return 'SILENT'
    return 'INFO'
  }
  return process.env.CI ? 'INFO' : 'DEBUG'
}

let configLogged = false
let bannerPrinted = false

function ts(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function level(): LogLevel {
  return resolveLevel()
}

export const bddLog = {
  info(scope: string, message: string): void {
    if (level() === 'SILENT') return
    console.log(`[${ts()}][${scope}] ℹ ${message}`)
  },

  debug(page: string, message: string): void {
    if (level() !== 'DEBUG') return
    console.log(`[${ts()}][Page: ${page}] ℹ ${message}`)
  },

  warn(scope: string, message: string): void {
    if (level() === 'SILENT') return
    console.log(`[${ts()}][${scope}] ⚠ ${message}`)
  },

  error(scope: string, message: string): void {
    console.log(`[${ts()}][${scope}] ✖ ${message}`)
  }
}

export function printBanner(): void {
  if (bannerPrinted || level() === 'SILENT') return
  bannerPrinted = true
  console.log('──────────────────────────────────────────────────────────────────────────')
  console.log('  qa-pdf-editor · Playwright-BDD')
  console.log('──────────────────────────────────────────────────────────────────────────')
}

export function logConfigOnce(): void {
  if (configLogged || level() === 'SILENT') return
  configLogged = true
  bddLog.info(
    'Configurations',
    JSON.stringify(
      {
        configurationFile: process.env.QA_CONFIGURATION_FILE ?? 'config/configuration.json',
        baseURL: process.env.BASE_URL,
        environment: process.env.ENVIRONMENT ?? '',
        app: process.env.APP ?? 'pdfhint',
        appendQaToken: process.env.APPEND_QA_TOKEN ?? '',
        emailSubjectBrandPrefix: process.env.EMAIL_SUBJECT_BRAND_PREFIX ?? '',
        headless: process.env.HEADLESS ?? 'default',
        paymentSmoke: process.env.PLAYWRIGHT_PAYMENT_SMOKE ?? ''
      },
      null,
      2
    )
  )
}

export function logScenarioStart(title: string): void {
  if (level() === 'SILENT') return
  console.log('──────────────────────────────────────────────────────────────────────────')
  console.log(`─ Running scenario: ${title} ...`)
  console.log('──────────────────────────────────────────────────────────────────────────')
}

export function logScenarioEnd(title: string, passed: boolean, lastUrl?: string): void {
  if (level() === 'SILENT') return
  const mark = passed ? '✔' : '✖'
  bddLog.info('Scenario', `${mark} Result: ${passed ? 'Passed' : 'Failed'} — ${title}`)
  if (lastUrl) bddLog.warn('LAST URL IN BROWSER', lastUrl)
}

export function logPageLoad(pageName: string): void {
  bddLog.debug(pageName, 'Loading page ...')
}

export function logVisitUrl(url: string): void {
  bddLog.debug('Browser', `Visiting url: ${url}`)
}

export function logElementAction(action: string, elementLabel: string, finder?: string): void {
  const detail = finder ? ` (${finder})` : ''
  bddLog.debug('Element', `${action} on element: "${elementLabel}"${detail}`)
}

export function logBrowserRefresh(): void {
  bddLog.debug('Browser', 'Refreshing page')
}

export function logExtractLastPaymentData(): void {
  bddLog.debug('CRM Customer Page', 'Extracting Last Payment Data')
}

export function logExtractTransactionCell(columnNth: number): void {
  bddLog.debug('Element', `Locating element: ${JSON.stringify({ css: `#transactionRow-0>td:nth-of-type(${columnNth})` })}`)
  bddLog.debug('Element', 'Extracting text from element')
}

export function logCrmPageLoadsForCustomerFlow(): void {
  logPageLoad('CRM Customer Page')
  logPageLoad('CRM Customers Table Page')
  logPageLoad('CRM Home Page')
}
