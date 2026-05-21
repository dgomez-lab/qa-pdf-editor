import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'

export const FAILURE_SCREENSHOT_DIR = path.join(
  process.cwd(),
  'cucumber-report',
  'failure-screenshots'
)

const MANIFEST_PATH = path.join(FAILURE_SCREENSHOT_DIR, 'manifest.ndjson')

function safeFileId(testId: string): string {
  return testId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export async function persistFailureScreenshot(page: Page, testInfo: TestInfo): Promise<void> {
  let buffer: Buffer
  try {
    buffer = await page.screenshot({ fullPage: true })
  } catch {
    return
  }

  fs.mkdirSync(FAILURE_SCREENSHOT_DIR, { recursive: true })
  fs.writeFileSync(path.join(FAILURE_SCREENSHOT_DIR, `${safeFileId(testInfo.testId)}.png`), buffer)

  const tags = (testInfo.tags ?? []).filter((t) => t.startsWith('@'))
  const tag = tags.find((t) => /^@(PDFEDITOR|PDFHINT)/i.test(t)) ?? tags[0] ?? ''
  const line =
      JSON.stringify({
        testId: testInfo.testId,
        title: testInfo.title,
        tag
      }) + '\n'
  fs.appendFileSync(MANIFEST_PATH, line)

  try {
    await testInfo.attach('failure-screenshot', {
      body: buffer,
      contentType: 'image/png'
    })
  } catch {
    /* attach optional when page closed */
  }
}
