import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  applyFailureScreenshots,
  findFailureScreenshotDirs,
  parseCucumberMessages,
  resolveAttemptStatus
} from './merge-regression-report.mjs'

function stepResult(status, message, exceptionMessage) {
  const result = { status }
  if (message) result.message = message
  if (exceptionMessage) result.exception = { message: exceptionMessage }
  return result
}

test.describe('merge regression report parsing', () => {
  test('uses the latest retry attempt and readable Cucumber step labels', () => {
    const envelopes = [
      {
        pickle: {
          id: 'pickle-1',
          uri: 'features/retry.feature',
          name: 'Retries the payment flow',
          tags: [{ name: '@SMOKE' }, { name: '@PDFEDITOR_RETRY_PAYMENT' }],
          steps: [
            { id: 'pickle-step-open', text: 'open the payment page' },
            { id: 'pickle-step-submit', text: 'submit the payment' }
          ]
        }
      },
      {
        testCase: {
          id: 'case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'case-step-open', pickleStepId: 'pickle-step-open' },
            { id: 'case-step-submit', pickleStepId: 'pickle-step-submit' }
          ]
        }
      },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-step-open' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'case-step-open',
          testStepResult: stepResult('FAILED', 'generic failure', 'specific failure')
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-1',
          testCaseResult: { status: 'FAILED' }
        }
      },
      { testCaseStarted: { id: 'attempt-2', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-2', testStepId: 'case-step-open' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-2',
          testStepId: 'case-step-open',
          testStepResult: stepResult('PASSED')
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-2', testStepId: 'case-step-submit' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-2',
          testStepId: 'case-step-submit',
          testStepResult: stepResult('PASSED')
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-2',
          testCaseResult: { status: 'UNKNOWN', duration: { seconds: 1, nanos: 500000000 } }
        }
      }
    ]

    const scenarios = parseCucumberMessages(envelopes)

    expect(scenarios).toEqual([
      expect.objectContaining({
        id: 'case-1',
        label: '@PDFEDITOR_RETRY_PAYMENT',
        featureName: 'features/retry.feature',
        scenarioName: 'Retries the payment flow',
        status: 'PASSED',
        durationMs: 1500,
        errorMessage: ''
      })
    ])
    expect(scenarios[0].steps.map((step) => step.text)).toEqual([
      'open the payment page',
      'submit the payment'
    ])
  })

  test('infers unresolved attempt statuses from non-hook steps only', () => {
    const passedDespiteHookFailure = {
      status: 'UNKNOWN',
      finished: true,
      steps: [
        { id: 'abc-before-test-case-1', status: 'FAILED' },
        { id: 'business-step-1', status: 'PASSED' }
      ]
    }
    const skippedBusinessStep = {
      status: 'UNKNOWN',
      finished: true,
      steps: [{ id: 'business-step-2', status: 'SKIPPED' }]
    }
    const unfinishedAttempt = {
      status: 'UNKNOWN',
      finished: false,
      steps: [{ id: 'business-step-3', status: 'PASSED' }]
    }

    expect(resolveAttemptStatus(passedDespiteHookFailure)).toBe('PASSED')
    expect(resolveAttemptStatus(skippedBusinessStep)).toBe('SKIPPED')
    expect(resolveAttemptStatus(unfinishedAttempt)).toBe('INCOMPLETE')
  })

  test('indexes persisted failure screenshots by tag and normalized title', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-regression-artifacts-'))
    try {
      const screenshotDir = path.join(artifactsDir, 'nested', 'failure-screenshots-shard-1')
      fs.mkdirSync(screenshotDir, { recursive: true })
      fs.writeFileSync(
        path.join(screenshotDir, 'manifest.ndjson'),
        [
          JSON.stringify({
            testId: 'tagged/image:one',
            title: 'Tagged scenario',
            tag: '@PDFEDITOR_TAGGED_FAILURE'
          }),
          JSON.stringify({
            testId: 'playwright-title',
            title: '[chromium] › features/report.feature › Normalized Scenario (pdfhint smoke)',
            tag: ''
          })
        ].join('\n') + '\n'
      )
      fs.writeFileSync(path.join(screenshotDir, 'tagged_image_one.png'), Buffer.from('tagged image'))
      fs.writeFileSync(path.join(screenshotDir, 'playwright-title.png'), Buffer.from('title image'))

      const scenarios = [
        {
          label: '@PDFEDITOR_TAGGED_FAILURE',
          scenarioName: 'Different scenario title',
          status: 'FAILED',
          steps: [{ id: 'business-step-1', status: 'FAILED' }]
        },
        {
          label: '@UNTAGGED',
          scenarioName: 'Normalized Scenario',
          status: 'FAILED',
          steps: [{ id: 'business-step-2', status: 'FAILED' }]
        },
        {
          label: '@PDFEDITOR_PASSED',
          scenarioName: 'Tagged scenario',
          status: 'PASSED',
          steps: [{ id: 'business-step-3', status: 'PASSED' }]
        }
      ]

      expect(findFailureScreenshotDirs(artifactsDir)).toEqual([screenshotDir])

      applyFailureScreenshots(scenarios, artifactsDir)

      expect(scenarios[0].screenshotDataUrl).toBe(
        `data:image/png;base64,${Buffer.from('tagged image').toString('base64')}`
      )
      expect(scenarios[0].steps[0].screenshotDataUrl).toBe(scenarios[0].screenshotDataUrl)
      expect(scenarios[1].screenshotDataUrl).toBe(
        `data:image/png;base64,${Buffer.from('title image').toString('base64')}`
      )
      expect(scenarios[2].screenshotDataUrl).toBeUndefined()
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })
})
