import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  applyFailureScreenshots,
  findFailureScreenshotDirs,
  gherkinSteps,
  parseCucumberMessages,
  resolveAttemptStatus
} from '../../scripts/merge-regression-report.mjs'

function pickleEnvelope() {
  return {
    pickle: {
      id: 'pickle-1',
      name: 'Scenario survives retry',
      uri: 'features/Retry.feature',
      tags: [{ name: '@PDFEDITOR_RETRY' }, { name: '@secondary' }],
      steps: [
        { id: 'pickle-step-1', text: 'I open the editor' },
        { id: 'pickle-step-2', text: 'I download the document' }
      ]
    }
  }
}

function testCaseEnvelope() {
  return {
    testCase: {
      id: 'case-1',
      pickleId: 'pickle-1',
      testSteps: [
        { id: 'case-before-test-case-hook', hookId: 'before-hook' },
        { id: 'test-step-1', pickleStepId: 'pickle-step-1' },
        { id: 'test-step-2', pickleStepId: 'pickle-step-2' }
      ]
    }
  }
}

function startedEnvelope(startedId) {
  return {
    testCaseStarted: {
      id: startedId,
      testCaseId: 'case-1'
    }
  }
}

function stepStartedEnvelope(startedId, testStepId) {
  return {
    testStepStarted: {
      testCaseStartedId: startedId,
      testStepId
    }
  }
}

function stepFinishedEnvelope(startedId, testStepId, status, message) {
  return {
    testStepFinished: {
      testCaseStartedId: startedId,
      testStepId,
      testStepResult: {
        status,
        message,
        duration: { seconds: 0, nanos: 25_000_000 }
      }
    }
  }
}

function finishedEnvelope(startedId, status) {
  return {
    testCaseFinished: {
      testCaseStartedId: startedId,
      testCaseResult: {
        status,
        duration: { seconds: 1, nanos: 500_000_000 }
      }
    }
  }
}

test.describe('merge regression report parsing', () => {
  test('keeps the latest retry attempt and maps Cucumber test steps to readable labels', () => {
    const scenarios = parseCucumberMessages([
      pickleEnvelope(),
      testCaseEnvelope(),
      startedEnvelope('attempt-1'),
      stepStartedEnvelope('attempt-1', 'test-step-1'),
      stepFinishedEnvelope('attempt-1', 'test-step-1', 'FAILED', 'network timeout'),
      finishedEnvelope('attempt-1', 'FAILED'),
      startedEnvelope('attempt-2'),
      stepStartedEnvelope('attempt-2', 'case-before-test-case-hook'),
      stepFinishedEnvelope('attempt-2', 'case-before-test-case-hook', 'PASSED', ''),
      stepStartedEnvelope('attempt-2', 'test-step-1'),
      stepFinishedEnvelope('attempt-2', 'test-step-1', 'PASSED', ''),
      stepStartedEnvelope('attempt-2', 'test-step-2'),
      stepFinishedEnvelope('attempt-2', 'test-step-2', 'PASSED', ''),
      finishedEnvelope('attempt-2', 'PASSED')
    ])

    expect(scenarios).toHaveLength(1)
    expect(scenarios[0]).toMatchObject({
      id: 'case-1',
      label: '@PDFEDITOR_RETRY',
      featureName: 'features/Retry.feature',
      scenarioName: 'Scenario survives retry',
      status: 'PASSED',
      durationMs: 1500,
      errorMessage: ''
    })
    expect(gherkinSteps(scenarios[0].steps).map((step) => step.text)).toEqual([
      'I open the editor',
      'I download the document'
    ])
  })

  test('resolves incomplete attempts without counting hook-only state as Gherkin progress', () => {
    const attempt = {
      status: 'UNKNOWN',
      finished: false,
      steps: [
        { id: 'case-before-test-case-hook', status: 'PASSED' },
        { id: 'test-step-1', status: 'UNKNOWN' }
      ]
    }

    expect(gherkinSteps(attempt.steps).map((step) => step.id)).toEqual(['test-step-1'])
    expect(resolveAttemptStatus(attempt)).toBe('INCOMPLETE')
  })

  test('attaches failure screenshots from manifests by primary tag', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regression-report-'))
    const screenshotDir = path.join(dir, 'failure-screenshots-shard-1')
    fs.mkdirSync(screenshotDir, { recursive: true })
    fs.writeFileSync(
      path.join(screenshotDir, 'manifest.ndjson'),
      JSON.stringify({
        testId: 'case-1/retry',
        tag: '@PDFEDITOR_RETRY',
        title: 'Scenario survives retry'
      }) + '\n'
    )
    fs.writeFileSync(path.join(screenshotDir, 'case-1_retry.png'), Buffer.from('png-data'))

    try {
      const scenarios = parseCucumberMessages([
        pickleEnvelope(),
        testCaseEnvelope(),
        startedEnvelope('attempt-1'),
        stepStartedEnvelope('attempt-1', 'test-step-1'),
        stepFinishedEnvelope('attempt-1', 'test-step-1', 'FAILED', 'download failed'),
        finishedEnvelope('attempt-1', 'FAILED')
      ])

      expect(findFailureScreenshotDirs(dir)).toEqual([screenshotDir])
      applyFailureScreenshots(scenarios, dir)

      expect(scenarios[0].screenshotDataUrl).toBe('data:image/png;base64,cG5nLWRhdGE=')
      expect(scenarios[0].steps[0].screenshotDataUrl).toBe('data:image/png;base64,cG5nLWRhdGE=')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
