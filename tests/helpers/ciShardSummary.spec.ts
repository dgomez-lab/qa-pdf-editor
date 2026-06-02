import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

type StepSummary = {
  text: string
  status: string
  error: string
}

type CucumberFailure = {
  tag: string
  scenarioName: string
  failedStep: string
  errorMessage: string
  steps: StepSummary[]
}

type PlaywrightFailure = {
  title: string
  status: string
  message: string
}

type CiShardSummaryModule = {
  isHookStepId: (stepId: string) => boolean
  parseCucumberFailures: (filePath: string) => Promise<CucumberFailure[]>
  buildMarkdown: (playwrightFailures: PlaywrightFailure[], cucumberFailures: CucumberFailure[]) => string
  walkSuites: (suites: unknown, filePrefix: string, out: PlaywrightFailure[]) => void
}

async function loadSummaryModule(): Promise<CiShardSummaryModule> {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/ci-shard-summary.mjs')).href
  return (await import(moduleUrl)) as CiShardSummaryModule
}

function writeNdjson(events: unknown[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(filePath, events.map((event) => (typeof event === 'string' ? event : JSON.stringify(event))).join('\n'))
  return filePath
}

test.describe('ci shard summary helpers', () => {
  test('identifies cucumber hook step ids without filtering real pickle steps', async () => {
    const summary = await loadSummaryModule()

    expect(summary.isHookStepId('abc-before-test-case-def')).toBe(true)
    expect(summary.isHookStepId('abc-after-test-run-def')).toBe(true)
    expect(summary.isHookStepId('pickle-step-payment-submit')).toBe(false)
  })

  test('parses failed cucumber attempts with hook steps filtered out', async () => {
    const summary = await loadSummaryModule()
    const filePath = writeNdjson([
      '{ malformed json',
      {
        pickle: {
          id: 'pickle-1',
          name: 'First payment refund',
          tags: [{ name: '@smoke' }, { name: '@PDFEDITOR_PAYMENT_FIRST_REFUND_EUR' }],
          steps: [
            { id: 'step-open', text: 'I open the payment page' },
            { id: 'step-submit', text: 'I submit payment | refund form' }
          ]
        }
      },
      { testCase: { id: 'case-1', pickleId: 'pickle-1' } },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'hook-before-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-open' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'step-open',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-submit' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'step-submit',
          testStepResult: {
            status: 'FAILED',
            exception: { message: 'Payment did not reach Success' }
          }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-1',
          testCaseResult: { status: 'FAILED' }
        }
      }
    ])

    try {
      const failures = await summary.parseCucumberFailures(filePath)

      expect(failures).toHaveLength(1)
      expect(failures[0]).toEqual({
        tag: '@PDFEDITOR_PAYMENT_FIRST_REFUND_EUR',
        scenarioName: 'First payment refund',
        failedStep: 'I submit payment | refund form',
        errorMessage: 'Payment did not reach Success',
        steps: [
          { text: 'I open the payment page', status: 'PASSED', error: '' },
          { text: 'I submit payment | refund form', status: 'FAILED', error: 'Payment did not reach Success' }
        ]
      })
    } finally {
      fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
    }
  })

  test('builds useful markdown for empty and mixed failure reports', async () => {
    const summary = await loadSummaryModule()

    expect(summary.buildMarkdown([], [])).toContain('No failed tests found in reports')

    const markdown = summary.buildMarkdown(
      [{ title: 'payment › refund', status: 'timedOut', message: 'Timed out after 180s' }],
      [
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Payment scenario',
          failedStep: 'I submit payment | refund form',
          errorMessage: 'Stripe modal missing',
          steps: [{ text: 'I submit payment | refund form', status: 'FAILED', error: 'Stripe modal missing' }]
        }
      ]
    )

    expect(markdown).toContain('## Regression shard — failed tests')
    expect(markdown).toContain('| I submit payment \\| refund form | FAILED |')
    expect(markdown).toContain('#### payment › refund')
    expect(markdown).toContain('Timed out after 180s')
  })

  test('walks nested playwright suites and extracts failed results only', async () => {
    const summary = await loadSummaryModule()
    const failures: PlaywrightFailure[] = []

    summary.walkSuites(
      [
        {
          title: 'features/payment/FirstPayment.feature',
          suites: [
            {
              title: 'refund flows',
              specs: [
                {
                  title: 'refund after first payment',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'timedOut', error: { message: 'Timeout waiting for payment success' } }
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
        title: 'features/payment/FirstPayment.feature › refund flows › refund after first payment',
        status: 'timedOut',
        message: 'Timeout waiting for payment success'
      }
    ])
  })
})
