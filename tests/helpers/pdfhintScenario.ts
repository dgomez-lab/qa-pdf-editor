export const PDFHINT_STAGING_BASE_URL = 'https://staging.pdfhint.com'

let pdfhintScenarioActive = false

type SavedPdfhintEnv = {
  baseUrl?: string
  appendQaToken?: string
  emailSubjectBrandPrefix?: string
  app?: string
}

let savedPdfhintEnv: SavedPdfhintEnv | null = null

export function setPdfhintScenarioActive(active: boolean): void {
  pdfhintScenarioActive = active
}

export function isPdfhintScenario(): boolean {
  return pdfhintScenarioActive
}

export function activatePdfhintScenarioEnv(): void {
  if (savedPdfhintEnv != null) return
  savedPdfhintEnv = {
    baseUrl: process.env.BASE_URL,
    appendQaToken: process.env.APPEND_QA_TOKEN,
    emailSubjectBrandPrefix: process.env.EMAIL_SUBJECT_BRAND_PREFIX,
    app: process.env.APP
  }
  setPdfhintScenarioActive(true)
  process.env.BASE_URL = PDFHINT_STAGING_BASE_URL
  process.env.APPEND_QA_TOKEN = 'false'
  process.env.EMAIL_SUBJECT_BRAND_PREFIX = 'pdfhint'
  process.env.APP = 'pdfhint'
}

export function deactivatePdfhintScenarioEnv(): void {
  setPdfhintScenarioActive(false)
  if (savedPdfhintEnv == null) return
  const s = savedPdfhintEnv
  if (s.baseUrl !== undefined) process.env.BASE_URL = s.baseUrl
  else delete process.env.BASE_URL
  if (s.appendQaToken !== undefined) process.env.APPEND_QA_TOKEN = s.appendQaToken
  else delete process.env.APPEND_QA_TOKEN
  if (s.emailSubjectBrandPrefix !== undefined) {
    process.env.EMAIL_SUBJECT_BRAND_PREFIX = s.emailSubjectBrandPrefix
  } else {
    delete process.env.EMAIL_SUBJECT_BRAND_PREFIX
  }
  if (s.app !== undefined) process.env.APP = s.app
  else delete process.env.APP
  savedPdfhintEnv = null
}
