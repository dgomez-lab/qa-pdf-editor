import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test, expect } from '@playwright/test'
import { buildMarkdown, parseCucumberFailures, walkSuites } from './ci-shard-summary.mjs'

function writeNdjson(envelopes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(filePath, envelopes.map((env) => JSON.stringify(env)).join('\n'))
  return { dir, filePath }
}

test.describe('ci shard summary parsing', () => {
  test('maps Cucumber runtime steps to readable Gherkin text and filters hooks', async () => {
    const { dir, filePath } = writeNdjson([
      {
        pickle: {
          id: 'pickle-payment',
          name: 'First payment succeeds',
          uri: 'features/payment/FirstPayment.feature',
          tags: [{ name: '@smoke' }, { name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'pickle-step-card', text: 'When I submit the card' },
            { id: 'pickle-step-receipt', text: 'Then I see the receipt' }
          ]
        }
      },
      {
        testCase: {
          id: 'test-case-payment',
          pickleId: 'pickle-payment',
          testSteps: [
            { id: 'attempt-before-test-case-hook', hookId: 'before-hook' },
            { id: 'runtime-step-card', pickleStepId: 'pickle-step-card' },
            { id: 'runtime-step-receipt', pickleStepId: 'pickle-step-receipt' }
          ]
        }
      },
      {
        testCaseStarted: {
          id: 'attempt-payment',
          testCaseId: 'test-case-payment'
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'attempt-before-test-case-hook'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'attempt-before-test-case-hook',
          testStepResult: { status: 'PASSED' }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-step-card'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-step-card',
          testStepResult: { status: 'PASSED' }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-step-receipt'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-step-receipt',
          testStepResult: {
            status: 'FAILED',
            message: 'generic failure',
            exception: { message: 'card declined at confirmation' }
          }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-payment',
          testCaseResult: { status: 'FAILED' }
        }
      }
    ])

    try {
      const failures = await parseCucumberFailures(filePath)

      expect(failures).toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'First payment succeeds',
          failedStep: 'Then I see the receipt',
          errorMessage: 'card declined at confirmation',
          steps: [
            { text: 'When I submit the card', status: 'PASSED', error: '' },
            {
              text: 'Then I see the receipt',
              status: 'FAILED',
              error: 'card declined at confirmation'
            }
          ]
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('collects nested Playwright failed and timed-out results', () => {
    const failures = []
    walkSuites(
      [
        {
          title: 'root suite',
          specs: [
            {
              title: 'checkout spec',
              tests: [
                {
                  results: [
                    { status: 'passed' },
                    { status: 'failed', error: { message: 'payment failed' } }
                  ]
                }
              ]
            }
          ],
          suites: [
            {
              title: 'nested suite',
              specs: [
                {
                  title: 'upload spec',
                  tests: [
                    {
                      results: [
                        { status: 'timedOut', errors: [{ message: 'upload timed out' }] }
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
      failures
    )

    expect(failures).toEqual([
      {
        title: 'root suite › checkout spec',
        status: 'failed',
        message: 'payment failed'
      },
      {
        title: 'root suite › nested suite › upload spec',
        status: 'timedOut',
        message: 'upload timed out'
      }
    ])
  })

  test('escapes Markdown pipes in Cucumber step rows', () => {
    const markdown = buildMarkdown([], [
      {
        tag: '@PDFEDITOR_PIPE',
        scenarioName: 'Pipe scenario',
        failedStep: 'Then value A | B is shown',
        errorMessage: '',
        steps: [{ text: 'Then value A | B is shown', status: 'FAILED', error: '' }]
      }
    ])

    expect(markdown).toContain('| Then value A \\| B is shown | FAILED |')
  })
})
