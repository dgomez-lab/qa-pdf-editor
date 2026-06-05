import { test, expect } from '@playwright/test'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

type PlaywrightFailure = {
  title: string
  status: string
  message: string
}

type CucumberStep = {
  text: string
  status: string
  error: string
}

type CucumberFailure = {
  tag: string
  scenarioName: string
  failedStep: string
  errorMessage: string
  steps: CucumberStep[]
}

type ShardSummaryModule = {
  walkSuites: (suites: unknown, filePrefix: string, out: PlaywrightFailure[]) => void
  parseCucumberFailures: (filePath: string) => Promise<CucumberFailure[]>
  buildMarkdown: (
    playwrightFailures: PlaywrightFailure[],
    cucumberFailures: CucumberFailure[]
  ) => string
}

async function loadShardSummary(): Promise<ShardSummaryModule> {
  const moduleUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'ci-shard-summary.mjs')).href
  return (await import(moduleUrl)) as ShardSummaryModule
}

test.describe('ci shard summary', () => {
  test('collects failed and timed out Playwright results from nested suites', async () => {
    const { walkSuites } = await loadShardSummary()
    const failures: PlaywrightFailure[] = []

    walkSuites(
      [
        {
          title: 'features/payment/FirstPayment.feature',
          specs: [
            {
              title: 'first payment retries',
              tests: [
                {
                  results: [
                    { status: 'passed' },
                    { status: 'failed', error: { message: 'Gateway declined' } }
                  ]
                }
              ]
            }
          ],
          suites: [
            {
              title: 'card form',
              specs: [
                {
                  title: 'timeout path',
                  tests: [
                    {
                      results: [
                        { status: 'timedOut', errors: [{ message: 'Timed out waiting for card iframe' }] }
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
        title: 'features/payment/FirstPayment.feature › first payment retries',
        status: 'failed',
        message: 'Gateway declined'
      },
      {
        title: 'features/payment/FirstPayment.feature › card form › timeout path',
        status: 'timedOut',
        message: 'Timed out waiting for card iframe'
      }
    ])
  })

  test('parses Cucumber failures with scenario tags, failed gherkin steps, and hook filtering', async () => {
    const { parseCucumberFailures } = await loadShardSummary()
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-shard-summary-'))
    const ndjsonPath = path.join(dir, 'messages.ndjson')
    const events = [
      {
        pickle: {
          id: 'pickle-1',
          name: 'Buying with fallback card',
          tags: [{ name: '@SMOKE' }, { name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'step-upload', text: 'I upload a PDF' },
            { id: 'step-pay', text: 'I pay | with card' }
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
          testStepResult: { status: 'FAILED', message: 'Before hook failed' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-upload' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'step-upload',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-pay' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'step-pay',
          testStepResult: {
            status: 'FAILED',
            message: 'Generic failure',
            exception: { message: 'Stripe decline detail' }
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

    await fs.writeFile(
      ndjsonPath,
      ['not-json', ...events.map((event) => JSON.stringify(event)), ''].join('\n')
    )

    await expect(parseCucumberFailures(ndjsonPath)).resolves.toEqual([
      {
        tag: '@PDFEDITOR_PAYMENT',
        scenarioName: 'Buying with fallback card',
        failedStep: 'I pay | with card',
        errorMessage: 'Stripe decline detail',
        steps: [
          { text: 'I upload a PDF', status: 'PASSED', error: '' },
          { text: 'I pay | with card', status: 'FAILED', error: 'Stripe decline detail' }
        ]
      }
    ])
  })

  test('formats actionable markdown for mixed Cucumber and Playwright failures', async () => {
    const { buildMarkdown } = await loadShardSummary()
    const md = buildMarkdown(
      [
        {
          title: 'features/payment/FirstPayment.feature › first payment retries',
          status: 'failed',
          message: 'Gateway declined'
        }
      ],
      [
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Buying with fallback card',
          failedStep: 'I pay | with card',
          errorMessage: 'Stripe decline detail',
          steps: [
            { text: 'I upload a PDF', status: 'PASSED', error: '' },
            { text: 'I pay | with card', status: 'FAILED', error: 'Stripe decline detail' }
          ]
        }
      ]
    )

    expect(md).toContain('## Regression shard — failed tests')
    expect(md).toContain('- **@PDFEDITOR_PAYMENT** — `I pay | with card`')
    expect(md).toContain('| I pay \\| with card | FAILED |')
    expect(md).toContain('Stripe decline detail')
    expect(md).toContain('#### features/payment/FirstPayment.feature › first payment retries')
    expect(md).toContain('Gateway declined')
  })

  test('formats an explicit no-failures message when reports contain no failures', async () => {
    const { buildMarkdown } = await loadShardSummary()

    expect(buildMarkdown([], [])).toBe(
      '## Regression shard — failed tests\n\nNo failed tests found in reports (check job log).\n'
    )
  })
})
