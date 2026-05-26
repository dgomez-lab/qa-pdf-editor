import { expect, test } from '@playwright/test'
import {
  parseCucumberMessages,
  resolveAttemptStatus,
  gherkinSteps,
  isHookStepId
} from '../../scripts/merge-regression-report.mjs'

const tagName = '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS'

function result(status, message) {
  return {
    status,
    duration: { seconds: '0', nanos: 1_500_000 },
    ...(message ? { exception: { message } } : {})
  }
}

function scenarioMessages({ stepStatus = 'PASSED', finalStatus = 'UNKNOWN', message } = {}) {
  return [
    {
      pickle: {
        id: 'pickle-seo-home',
        uri: 'features/seo.feature',
        name: 'SEO home header hrefs',
        tags: [{ name: tagName }],
        steps: [{ id: 'pickle-step-home-header', text: 'the homepage header hrefs are absolute' }]
      }
    },
    {
      testCase: {
        id: 'test-case-seo-home',
        pickleId: 'pickle-seo-home',
        testSteps: [
          { id: 'test-case-seo-home-before-test-case-0' },
          { id: 'test-case-seo-home-step-0', pickleStepId: 'pickle-step-home-header' }
        ]
      }
    },
    {
      testCaseStarted: {
        id: 'attempt-seo-home',
        testCaseId: 'test-case-seo-home'
      }
    },
    {
      testStepStarted: {
        testCaseStartedId: 'attempt-seo-home',
        testStepId: 'test-case-seo-home-before-test-case-0'
      }
    },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-seo-home',
        testStepId: 'test-case-seo-home-before-test-case-0',
        testStepResult: result('PASSED')
      }
    },
    {
      testStepStarted: {
        testCaseStartedId: 'attempt-seo-home',
        testStepId: 'test-case-seo-home-step-0'
      }
    },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-seo-home',
        testStepId: 'test-case-seo-home-step-0',
        testStepResult: result(stepStatus, message)
      }
    },
    {
      testCaseFinished: {
        testCaseStartedId: 'attempt-seo-home',
        testCaseResult: {
          status: finalStatus,
          duration: { seconds: '1', nanos: 0 }
        }
      }
    }
  ]
}

test.describe('merge regression report parsing', () => {
  test('infers completed UNKNOWN attempts from gherkin step results', () => {
    expect(
      resolveAttemptStatus({
        status: 'UNKNOWN',
        finished: true,
        steps: [
          { id: 'test-case-before-test-case-0', status: 'PASSED' },
          { id: 'test-case-step-0', status: 'PASSED' }
        ]
      })
    ).toBe('PASSED')

    expect(
      resolveAttemptStatus({
        status: 'UNKNOWN',
        finished: true,
        steps: [{ id: 'test-case-step-0', status: 'FAILED' }]
      })
    ).toBe('FAILED')
  })

  test('filters hook steps from scenario gherkin steps', () => {
    const steps = [
      { id: 'test-case-before-test-case-0', status: 'PASSED' },
      { id: 'test-case-step-0', status: 'PASSED' },
      { id: 'test-case-after-test-run-0', status: 'PASSED' }
    ]

    expect(isHookStepId('test-case-before-test-case-0')).toBe(true)
    expect(isHookStepId('test-case-after-test-run-0')).toBe(true)
    expect(gherkinSteps(steps)).toEqual([{ id: 'test-case-step-0', status: 'PASSED' }])
  })

  test('maps test step ids to readable pickle step text when result is UNKNOWN', () => {
    const [scenario] = parseCucumberMessages(scenarioMessages())
    const [step] = gherkinSteps(scenario.steps)

    expect(scenario).toMatchObject({
      label: tagName,
      featureName: 'features/seo.feature',
      scenarioName: 'SEO home header hrefs',
      status: 'PASSED',
      durationMs: 1000
    })
    expect(step).toMatchObject({
      id: 'test-case-seo-home-step-0',
      text: 'the homepage header hrefs are absolute',
      status: 'PASSED',
      durationNs: 1_500_000
    })
  })

  test('surfaces failed gherkin step messages when final result is UNKNOWN', () => {
    const [scenario] = parseCucumberMessages(
      scenarioMessages({
        stepStatus: 'FAILED',
        message: 'Header link stayed relative'
      })
    )
    const [step] = gherkinSteps(scenario.steps)

    expect(scenario.status).toBe('FAILED')
    expect(scenario.errorMessage).toBe('Header link stayed relative')
    expect(step).toMatchObject({
      text: 'the homepage header hrefs are absolute',
      status: 'FAILED',
      errorMessage: 'Header link stayed relative'
    })
  })
})
