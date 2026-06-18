import * as fs from 'node:fs'
import * as path from 'node:path'
import { test, expect } from '@playwright/test'
import {
  FAILURE_SCREENSHOT_DIR,
  persistFailureScreenshot
} from './failureScreenshot'

test.describe('failureScreenshot', () => {
  test.beforeEach(() => {
    fs.rmSync(FAILURE_SCREENSHOT_DIR, { recursive: true, force: true })
  })

  test.afterEach(() => {
    fs.rmSync(FAILURE_SCREENSHOT_DIR, { recursive: true, force: true })
  })

  test('persists sanitized screenshot file, manifest entry, and attachment', async () => {
    const screenshot = Buffer.from('fake-png')
    const attachments: Array<{ name: string; body: Buffer; contentType: string }> = []
    const page = {
      screenshot: async (options: { fullPage: boolean }) => {
        expect(options).toEqual({ fullPage: true })
        return screenshot
      }
    }
    const testInfo = {
      testId: 'suite/login fails: chrome?#[1]',
      title: '[chromium] › Checkout › payment denied',
      tags: ['@smoke', '@PDFEDITOR_PAYMENT'],
      attach: async (
        name: string,
        attachment: { body: Buffer; contentType: string }
      ) => {
        attachments.push({ name, ...attachment })
      }
    }

    await persistFailureScreenshot(page as never, testInfo as never)

    const screenshotPath = path.join(
      FAILURE_SCREENSHOT_DIR,
      'suite_login_fails__chrome___1_.png'
    )
    expect(fs.readFileSync(screenshotPath)).toEqual(screenshot)
    const manifestPath = path.join(FAILURE_SCREENSHOT_DIR, 'manifest.ndjson')
    const manifestLines = fs.readFileSync(manifestPath, 'utf8').trim().split('\n')
    expect(manifestLines).toHaveLength(1)
    expect(JSON.parse(manifestLines[0])).toEqual({
      testId: 'suite/login fails: chrome?#[1]',
      title: '[chromium] › Checkout › payment denied',
      tag: '@PDFEDITOR_PAYMENT'
    })
    expect(attachments).toEqual([
      {
        name: 'failure-screenshot',
        body: screenshot,
        contentType: 'image/png'
      }
    ])
  })

  test('falls back to the first tag and keeps artifacts when attach fails', async () => {
    const screenshot = Buffer.from('fake-png')
    const page = {
      screenshot: async () => screenshot
    }
    const testInfo = {
      testId: 'scenario-id',
      title: 'Scenario without preferred tag',
      tags: ['@smoke'],
      attach: async () => {
        throw new Error('page closed')
      }
    }

    await persistFailureScreenshot(page as never, testInfo as never)

    const manifestPath = path.join(FAILURE_SCREENSHOT_DIR, 'manifest.ndjson')
    expect(JSON.parse(fs.readFileSync(manifestPath, 'utf8').trim())).toEqual({
      testId: 'scenario-id',
      title: 'Scenario without preferred tag',
      tag: '@smoke'
    })
    expect(fs.readFileSync(path.join(FAILURE_SCREENSHOT_DIR, 'scenario-id.png'))).toEqual(
      screenshot
    )
  })

  test('does not write artifacts when screenshot capture fails', async () => {
    const page = {
      screenshot: async () => {
        throw new Error('closed page')
      }
    }
    const testInfo = {
      testId: 'scenario-id',
      title: 'Scenario',
      tags: ['@PDFHINT_SEO'],
      attach: async () => {
        throw new Error('should not attach')
      }
    }

    await persistFailureScreenshot(page as never, testInfo as never)

    expect(fs.existsSync(FAILURE_SCREENSHOT_DIR)).toBe(false)
  })
})
