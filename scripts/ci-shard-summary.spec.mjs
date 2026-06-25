import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  buildMarkdown,
  parseCucumberFailures,
  walkSuites
} from './ci-shard-summary.mjs'

function writeNdjson(envelopes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(filePath, envelopes.map((env) => JSON.stringify(env)).join('\n'))
  return { dir, filePath }
}

test.describe('ci-shard-summary', () => {
  test('collects failed and timed out results from nested Playwright suites', () => {
    const out = []
    walkSuites(
      [
        {
          title: 'features/payment/FirstPayment.feature',
          suites: [
            {
              title: 'First payment',
              specs: [
                {
                  title: 'declined card shows an error',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'timedOut', error: { message: 'Timeout 30000ms exceeded' } }
                      ]
                    }
                  ]
                },
                {
                  title: 'successful card creates account',
                  tests: [
                    {
                      results: [
                        {
                          status: 'failed',
                          errors: [{ message: 'Expected account email' }]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      '',
      out
    )

    expect(out).toEqual([
      {
        title: 'features/payment/FirstPayment.feature › First payment › declined card shows an error',
        status: 'timedOut',
        message: 'Timeout 30000ms exceeded'
      },
      {
        title: 'features/payment/FirstPayment.feature › First payment › successful card creates account',
        status: 'failed',
        message: 'Expected account email'
      }
    ])
  })

  test('parses readable Cucumber failures while filtering hooks and preferring exception messages', async () => {
    const { dir, filePath } = writeNdjson([
      {
        pickle: {
          id: 'pickle-1',
          name: 'Payment receipt is shown',
          tags: [{ name: '@SMOKE' }, { name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'pickle-step-1', text: 'Given a customer opens checkout' },
            { id: 'pickle-step-2', text: 'Then the receipt should be visible' }
          ]
        }
      },
      {
        testCase: {
          id: 'test-case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'abc-before-test-case-1' },
            { id: 'runtime-step-1', pickleStepId: 'pickle-step-1' },
            { id: 'runtime-step-2', pickleStepId: 'pickle-step-2' }
          ]
        }
      },
      {
        testCaseStarted: {
          id: 'attempt-1',
          testCaseId: 'test-case-1'
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'abc-before-test-case-1'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'abc-before-test-case-1',
          testStepResult: {
            status: 'FAILED',
            message: 'before hook failed'
          }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-1'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-1',
          testStepResult: {
            status: 'PASSED'
          }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-2'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-2',
          testStepResult: {
            status: 'FAILED',
            message: 'generic assertion message',
            exception: { message: 'AssertionError: expected receipt' }
          }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-1',
          testCaseResult: {
            status: 'FAILED'
          }
        }
      }
    ])

    try {
      await expect(parseCucumberFailures(filePath)).resolves.toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Payment receipt is shown',
          failedStep: 'Then the receipt should be visible',
          errorMessage: 'AssertionError: expected receipt',
          steps: [
            {
              text: 'Given a customer opens checkout',
              status: 'PASSED',
              error: ''
            },
            {
              text: 'Then the receipt should be visible',
              status: 'FAILED',
              error: 'AssertionError: expected receipt'
            }
          ]
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('escapes Markdown pipe characters and reports empty artifacts clearly', () => {
    const withFailure = buildMarkdown([], [
      {
        tag: '@PDFHINT_FORM',
        scenarioName: 'Form labels render',
        failedStep: 'Then label A | B is visible',
        errorMessage: 'label A | B missing',
        steps: [
          {
            text: 'When the label is A | B',
            status: 'FAILED',
            error: 'label A | B missing'
          }
        ]
      }
    ])

    expect(withFailure).toContain('- **@PDFHINT_FORM** — `Then label A | B is visible`')
    expect(withFailure).toContain('| When the label is A \\| B | FAILED |')
    expect(withFailure).toContain('label A | B missing')
    expect(buildMarkdown([], [])).toContain('No failed tests found in reports (check job log).')
  })
})
