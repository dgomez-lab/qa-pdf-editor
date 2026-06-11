import { test, expect } from '@playwright/test'
import {
  gherkinSteps,
  parseCucumberMessages,
  resolveAttemptStatus
} from './merge-regression-report.mjs'

function pickleEnvelope() {
  return {
    pickle: {
      id: 'pickle-1',
      uri: 'features/SEO.feature',
      name: 'Header links are absolute',
      tags: [{ name: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS' }],
      steps: [
        { id: 'pickle-step-open', text: 'I open the home page' },
        { id: 'pickle-step-check', text: 'I check header hrefs' }
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
        { id: 'hook-before-test-case-1' },
        { id: 'test-step-open', pickleStepId: 'pickle-step-open' },
        { id: 'test-step-check', pickleStepId: 'pickle-step-check' }
      ]
    }
  }
}

function attemptEnvelopes({
  attemptId,
  caseStatus,
  checkStatus,
  includeScreenshot = false
}) {
  const envelopes = [
    { testCaseStarted: { id: attemptId, testCaseId: 'case-1' } },
    { testStepStarted: { testCaseStartedId: attemptId, testStepId: 'hook-before-test-case-1' } },
    {
      testStepFinished: {
        testCaseStartedId: attemptId,
        testStepId: 'hook-before-test-case-1',
        testStepResult: { status: 'PASSED' }
      }
    },
    { testStepStarted: { testCaseStartedId: attemptId, testStepId: 'test-step-open' } },
    {
      testStepFinished: {
        testCaseStartedId: attemptId,
        testStepId: 'test-step-open',
        testStepResult: { status: 'PASSED' }
      }
    },
    { testStepStarted: { testCaseStartedId: attemptId, testStepId: 'test-step-check' } },
    {
      testStepFinished: {
        testCaseStartedId: attemptId,
        testStepId: 'test-step-check',
        testStepResult: {
          status: checkStatus,
          exception: checkStatus === 'FAILED' ? { message: 'expected /forms link' } : undefined
        }
      }
    }
  ]

  if (includeScreenshot) {
    envelopes.push({
      attachment: {
        testCaseStartedId: attemptId,
        testStepId: 'test-step-check',
        mediaType: 'image/png',
        body: 'ZmFrZQ=='
      }
    })
  }

  envelopes.push({
    testCaseFinished: {
      testCaseStartedId: attemptId,
      testCaseResult: {
        status: caseStatus,
        duration: { seconds: 1, nanos: 500_000_000 },
        message: caseStatus === 'FAILED' ? 'scenario failed' : ''
      }
    }
  })

  return envelopes
}

test.describe('merge-regression-report parser', () => {
  test('resolves readable Gherkin step text and failure attachments', () => {
    const scenarios = parseCucumberMessages([
      pickleEnvelope(),
      testCaseEnvelope(),
      ...attemptEnvelopes({
        attemptId: 'attempt-1',
        caseStatus: 'FAILED',
        checkStatus: 'FAILED',
        includeScreenshot: true
      })
    ])

    expect(scenarios).toHaveLength(1)
    expect(scenarios[0]).toMatchObject({
      label: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS',
      featureName: 'features/SEO.feature',
      scenarioName: 'Header links are absolute',
      status: 'FAILED',
      durationMs: 1500,
      errorMessage: 'scenario failed',
      screenshotDataUrl: 'data:image/png;base64,ZmFrZQ=='
    })
    expect(gherkinSteps(scenarios[0].steps).map((step) => step.text)).toEqual([
      'I open the home page',
      'I check header hrefs'
    ])
    expect(scenarios[0].steps.find((step) => step.id === 'test-step-check')).toMatchObject({
      status: 'FAILED',
      errorMessage: 'expected /forms link',
      screenshotDataUrl: 'data:image/png;base64,ZmFrZQ=='
    })
  })

  test('keeps the final retry attempt for each test case', () => {
    const scenarios = parseCucumberMessages([
      pickleEnvelope(),
      testCaseEnvelope(),
      ...attemptEnvelopes({
        attemptId: 'attempt-1',
        caseStatus: 'FAILED',
        checkStatus: 'FAILED'
      }),
      ...attemptEnvelopes({
        attemptId: 'attempt-2',
        caseStatus: 'PASSED',
        checkStatus: 'PASSED'
      })
    ])

    expect(scenarios).toHaveLength(1)
    expect(scenarios[0].status).toBe('PASSED')
    expect(scenarios[0].errorMessage).toBe('')
    expect(gherkinSteps(scenarios[0].steps).every((step) => step.status === 'PASSED')).toBe(true)
  })

  test('marks unfinished attempts as incomplete after ignoring hooks', () => {
    expect(
      resolveAttemptStatus({
        status: 'UNKNOWN',
        finished: false,
        steps: [
          { id: 'abc-before-test-case-1', status: 'PASSED' },
          { id: 'test-step-open', status: 'PASSED' }
        ]
      })
    ).toBe('INCOMPLETE')
    expect(
      resolveAttemptStatus({
        status: 'UNKNOWN',
        finished: true,
        steps: [
          { id: 'abc-before-test-case-1', status: 'FAILED' },
          { id: 'test-step-open', status: 'PASSED' }
        ]
      })
    ).toBe('PASSED')
  })
})
