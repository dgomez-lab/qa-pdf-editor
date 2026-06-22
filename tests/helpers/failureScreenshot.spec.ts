import { test, expect } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { FAILURE_SCREENSHOT_DIR, persistFailureScreenshot } from './failureScreenshot'

const backupDir = path.join(os.tmpdir(), `failure-screenshots-backup-${process.pid}`)

test.describe('failure screenshot persistence', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    fs.rmSync(backupDir, { recursive: true, force: true })
    if (fs.existsSync(FAILURE_SCREENSHOT_DIR)) {
      fs.mkdirSync(path.dirname(backupDir), { recursive: true })
      fs.renameSync(FAILURE_SCREENSHOT_DIR, backupDir)
    }
  })

  test.beforeEach(() => {
    fs.rmSync(FAILURE_SCREENSHOT_DIR, { recursive: true, force: true })
  })

  test.afterAll(() => {
    fs.rmSync(FAILURE_SCREENSHOT_DIR, { recursive: true, force: true })
    if (fs.existsSync(backupDir)) {
      fs.mkdirSync(path.dirname(FAILURE_SCREENSHOT_DIR), { recursive: true })
      fs.renameSync(backupDir, FAILURE_SCREENSHOT_DIR)
    }
  })

  test('writes a sanitized screenshot file, manifest entry, and attachment', async () => {
    const screenshot = Buffer.from('fake-png')
    const screenshotOptions: unknown[] = []
    const attachments: Array<{ name: string; body: Buffer; contentType: string }> = []
    const page = {
      screenshot: async (options: unknown) => {
        screenshotOptions.push(options)
        return screenshot
      }
    } as unknown as Page
    const testInfo = {
      testId: 'features/seo.feature:12#header links',
      title: 'SEO header links expose absolute hrefs',
      tags: ['not-a-tag', '@smoke', '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS'],
      attach: async (name: string, attachment: { body: Buffer; contentType: string }) => {
        attachments.push({ name, body: attachment.body, contentType: attachment.contentType })
      }
    } as unknown as TestInfo

    await persistFailureScreenshot(page, testInfo)

    expect(screenshotOptions).toEqual([{ fullPage: true }])
    expect(fs.readFileSync(path.join(FAILURE_SCREENSHOT_DIR, 'features_seo_feature_12_header_links.png'))).toEqual(
      screenshot
    )
    expect(fs.readFileSync(path.join(FAILURE_SCREENSHOT_DIR, 'manifest.ndjson'), 'utf8')
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line))).toEqual([
      {
        testId: 'features/seo.feature:12#header links',
        title: 'SEO header links expose absolute hrefs',
        tag: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS'
      }
    ])
    expect(attachments).toEqual([
      {
        name: 'failure-screenshot',
        body: screenshot,
        contentType: 'image/png'
      }
    ])
  })

  test('does not create artifacts when screenshot capture fails', async () => {
    const page = {
      screenshot: async () => {
        throw new Error('page closed')
      }
    } as unknown as Page
    const testInfo = {
      testId: 'closed-page',
      title: 'closed page',
      tags: ['@PDFEDITOR_CLOSED'],
      attach: async () => {
        throw new Error('should not attach')
      }
    } as unknown as TestInfo

    await persistFailureScreenshot(page, testInfo)

    expect(fs.existsSync(FAILURE_SCREENSHOT_DIR)).toBe(false)
  })
})
