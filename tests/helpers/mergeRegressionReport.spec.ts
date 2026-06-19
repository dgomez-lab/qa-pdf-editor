import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

type ReportStep = {
  id: string
  text: string
  status: string
  errorMessage?: string
}

type ReportScenario = {
  label: string
  scenarioName: string
  status: string
  steps: ReportStep[]
  errorMessage?: string
  screenshotDataUrl?: string | null
}

type MergeRegressionReportModule = {
  parseCucumberMessages: (envelopes: unknown[]) => ReportScenario[]
  applyFailureScreenshots: (scenarios: ReportScenario[], artifactsDir: string) => void
  findFailureScreenshotDirs: (root: string) => string[]
}

let report: MergeRegressionReportModule

test.beforeAll(async () => {
  const moduleUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'merge-regression-report.mjs')).href
  report = (await import(moduleUrl)) as MergeRegressionReportModule
})

test.describe('merge regression report parser', () => {
  test('keeps the latest retry attempt and maps Cucumber step ids to readable text', () => {
    const envelopes = [
      {
        pickle: {
          id: 'pickle-1',
          uri: 'features/payment.feature',
          name: 'Retrying payment smoke',
          tags: [{ name: '@PDFEDITOR_PAYMENT_SMOKE' }],
          steps: [
            { id: 'pickle-step-1', text: 'the user starts checkout' },
            { id: 'pickle-step-2', text: 'the payment succeeds' }
          ]
        }
      },
      {
        testCase: {
          id: 'case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'hook-before-test-case-1' },
            { id: 'test-step-1', pickleStepId: 'pickle-step-1' },
            { id: 'test-step-2', pickleStepId: 'pickle-step-2' },
            { id: 'hook-after-test-case-1' }
          ]
        }
      },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'hook-before-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'test-step-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-2' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'test-step-2',
          testStepResult: { status: 'FAILED', message: 'first attempt failed' }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-1',
          testCaseResult: { status: 'FAILED', duration: { seconds: 1, nanos: 0 } }
        }
      },
      { testCaseStarted: { id: 'attempt-2', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-2', testStepId: 'hook-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-2',
          testStepId: 'hook-before-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-2', testStepId: 'test-step-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-2',
          testStepId: 'test-step-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-2', testStepId: 'test-step-2' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-2',
          testStepId: 'test-step-2',
          testStepResult: { status: 'PASSED' }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-2',
          testCaseResult: { status: 'UNKNOWN', duration: { seconds: 2, nanos: 0 } }
        }
      }
    ]

    const scenarios = report.parseCucumberMessages(envelopes)

    expect(scenarios).toHaveLength(1)
    expect(scenarios[0].label).toBe('@PDFEDITOR_PAYMENT_SMOKE')
    expect(scenarios[0].status).toBe('PASSED')
    expect(scenarios[0].errorMessage).toBe('')
    expect(scenarios[0].steps.map((step) => step.text)).toEqual([
      'hook-before-test-case-1',
      'the user starts checkout',
      'the payment succeeds'
    ])
  })

  test('indexes failure screenshots by manifest tag using sanitized test ids', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-report-artifacts-'))
    const screenshotDir = path.join(artifactsDir, 'nested', 'failure-screenshots-shard-1')
    fs.mkdirSync(screenshotDir, { recursive: true })

    const testId = 'features/payment.feature:Retrying payment smoke#chromium'
    const safeId = testId.replace(/[^a-zA-Z0-9_-]/g, '_')
    const png = Buffer.from('png-fixture')
    fs.writeFileSync(path.join(screenshotDir, `${safeId}.png`), png)
    fs.writeFileSync(
      path.join(screenshotDir, 'manifest.ndjson'),
      `${JSON.stringify({
        testId,
        title: 'Retrying payment smoke',
        tag: '@PDFEDITOR_PAYMENT_SMOKE'
      })}\n`
    )

    try {
      const scenarios: ReportScenario[] = [
        {
          label: '@PDFEDITOR_PAYMENT_SMOKE',
          scenarioName: 'Retrying payment smoke',
          status: 'FAILED',
          steps: [{ id: 'test-step-1', text: 'the payment succeeds', status: 'FAILED' }]
        }
      ]

      expect(report.findFailureScreenshotDirs(artifactsDir)).toEqual([screenshotDir])

      report.applyFailureScreenshots(scenarios, artifactsDir)

      expect(scenarios[0].screenshotDataUrl).toBe(`data:image/png;base64,${png.toString('base64')}`)
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })
})
