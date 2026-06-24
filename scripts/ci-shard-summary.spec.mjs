import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { test, expect } from '@playwright/test'
import { buildMarkdown, parseCucumberFailures, walkSuites } from './ci-shard-summary.mjs'

test.describe('ci-shard-summary', () => {
  test('summarizes nested Playwright failed and timed-out results', () => {
    const failures = []

    walkSuites(
      [
        {
          title: 'features/payment/FirstPayment.feature',
          suites: [
            {
              title: 'Payment checkout',
              specs: [
                {
                  title: 'declined card message',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'failed', error: { message: 'Expected decline banner' } }
                      ]
                    }
                  ]
                },
                {
                  title: 'confirmation email',
                  tests: [
                    {
                      results: [
                        {
                          status: 'timedOut',
                          errors: [{ message: 'Email did not arrive' }]
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
      failures
    )

    expect(failures).toEqual([
      {
        title: 'features/payment/FirstPayment.feature › Payment checkout › declined card message',
        status: 'failed',
        message: 'Expected decline banner'
      },
      {
        title: 'features/payment/FirstPayment.feature › Payment checkout › confirmation email',
        status: 'timedOut',
        message: 'Email did not arrive'
      }
    ])
  })

  test('parses failed Cucumber attempts with readable steps and hook filtering', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-shard-summary-'))
    const messagesPath = path.join(dir, 'messages.ndjson')
    const envelopes = [
      {
        pickle: {
          id: 'pickle-1',
          name: 'Pay with a declined card',
          tags: [{ name: '@PDFEDITOR_PAYMENT' }, { name: '@regression' }],
          steps: [
            { id: 'step-1', text: 'I upload a PDF' },
            { id: 'step-2', text: 'I pay with card | Generic' }
          ]
        }
      },
      { testCase: { id: 'case-1', pickleId: 'pickle-1' } },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'fixture-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'fixture-before-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'step-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-2' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'step-2',
          testStepResult: {
            status: 'FAILED',
            message: 'Raw failure message',
            exception: { message: 'Stripe decline was not shown' }
          }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-1',
          testCaseResult: { status: 'FAILED' }
        }
      }
    ]

    await fs.writeFile(messagesPath, `${envelopes.map((env) => JSON.stringify(env)).join('\n')}\n`)

    try {
      expect(await parseCucumberFailures(messagesPath)).toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Pay with a declined card',
          failedStep: 'I pay with card | Generic',
          errorMessage: 'Stripe decline was not shown',
          steps: [
            { text: 'I upload a PDF', status: 'PASSED', error: '' },
            {
              text: 'I pay with card | Generic',
              status: 'FAILED',
              error: 'Stripe decline was not shown'
            }
          ]
        }
      ])
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  test('builds markdown with escaped Gherkin tables and empty fallback', () => {
    const empty = buildMarkdown([], [])

    expect(empty).toContain('## Regression shard — failed tests')
    expect(empty).toContain('No failed tests found in reports')

    const markdown = buildMarkdown(
      [{ title: 'spec › checkout', status: 'failed', message: 'Browser closed' }],
      [
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Pay with a declined card',
          failedStep: 'I pay with card | Generic',
          errorMessage: 'Stripe decline was not shown',
          steps: [
            { text: 'I upload a PDF', status: 'PASSED', error: '' },
            { text: 'I pay with card | Generic', status: 'FAILED', error: 'Stripe decline was not shown' }
          ]
        }
      ]
    )

    expect(markdown).toContain('- **@PDFEDITOR_PAYMENT** — `I pay with card | Generic`')
    expect(markdown).toContain('| I pay with card \\| Generic | FAILED |')
    expect(markdown).toContain('Stripe decline was not shown')
    expect(markdown).toContain('#### spec › checkout')
    expect(markdown).toContain('Browser closed')
  })
})
