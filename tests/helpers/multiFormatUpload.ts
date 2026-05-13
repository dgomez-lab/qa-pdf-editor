import * as fs from 'fs'
import * as path from 'path'
import type { Page } from '@playwright/test'
import { home } from '../pages/editorSelectors'
import { gotoMarketingPath } from './mvpsUrl'

const fixturesDir = path.join(__dirname, '..', 'fixtures')

/**
 * Devuelve la ruta a la fixture del formato pedido. Si no existe en `tests/fixtures/`,
 * usa la variable `PLAYWRIGHT_FIXTURE_<FORMAT>` apuntando a una ruta absoluta.
 * En última instancia genera una copia de `sample.pdf` con la extensión deseada (la app
 * suele validar por tipo MIME, así que para casos negativos esto sirve; el caller debe
 * usar `skipIfMissing` si necesita un archivo realmente válido del formato).
 */
export function fixturePathFor(format: 'DOCX' | 'XLSX' | 'PPTX' | 'JPG' | 'JPEG' | 'PNG' | 'PDF'): string | null {
  const ext = format.toLowerCase()
  const direct = path.join(fixturesDir, `sample.${ext}`)
  if (fs.existsSync(direct)) return direct

  const envName = `PLAYWRIGHT_FIXTURE_${format.toUpperCase()}`
  const envPath = process.env[envName]?.trim()
  if (envPath && fs.existsSync(envPath)) return envPath

  if (format === 'PDF') {
    const fallback = path.join(fixturesDir, 'sample.pdf')
    if (fs.existsSync(fallback)) return fallback
  }
  return null
}

export function fixturePathOrSkip(test: { skip: (cond: boolean, reason: string) => void }, format: Parameters<typeof fixturePathFor>[0]): string {
  const p = fixturePathFor(format)
  if (!p) {
    test.skip(true, `Fixture sample.${format.toLowerCase()} ausente. Define PLAYWRIGHT_FIXTURE_${format} o copia el archivo a tests/fixtures/.`)
    return ''
  }
  return p
}

/**
 * Slug → ruta de Landing Page. Alineado con `landingAlt` (legacy `JsonProcessor.processLanding`).
 */
const LANDING_PATHS: Record<string, string> = {
  wordToPDF: '/lp/word-to-pdf',
  excelToPDF: '/lp/excel-to-pdf',
  pwpToPDF: '/lp/powerpoint-to-pdf',
  jpgToPDF: '/lp/jpg-to-pdf',
  pngToPDF: '/lp/png-to-pdf',
  compressPDF: '/lp/compress-pdf',
  editPDF: '/lp/edit-pdf',
  editFillPDF: '/lp/edit-fill-pdf',
  editScannedPDF: '/lp/edit-scanned-pdf',
  insertImage: '/lp/add-image-to-pdf',
  watermark: '/lp/watermark',
  rotatePDF: '/lp/rotate-pdf',
  deletePdfPages: '/lp/delete-pdf-pages',
  pdfReader: '/lp/pdf-reader',
  signPdf: '/lp/sign-pdf',
  howToConvertPdfWord: '/lp/pdf-to-word',
  pdfToJpg: '/lp/pdf-to-jpg',
  pdfToPng: '/lp/pdf-to-png',
  pdfToPwp: '/lp/pdf-to-powerpoint',
  pdfToExcel: '/lp/pdf-to-excel',
  splitPdf: '/lp/split-pdf',
  mergePDF: '/lp/merge-pdf'
}

export function landingPathFor(slug: string): string {
  return LANDING_PATHS[slug] ?? `/lp/${slug.toLowerCase()}`
}

export async function gotoLanding(page: Page, slug: string): Promise<void> {
  await gotoMarketingPath(page, landingPathFor(slug), { waitUntil: 'domcontentloaded' })
}

export async function uploadFromLanding(page: Page, slug: string, filePath: string): Promise<void> {
  await gotoLanding(page, slug)
  const input = page.locator(home.fileInput).first()
  await input.waitFor({ state: 'attached', timeout: 60_000 })
  await input.setInputFiles(filePath)
}
