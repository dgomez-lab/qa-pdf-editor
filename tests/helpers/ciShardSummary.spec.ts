import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

type PlaywrightFailure = {
  title: string
  status: string
  message: string
}

type CucumberFailure = {
  tag: string
  scenarioName: string
  failedStep: string
  errorMessage: string
  steps: Array<{ text: string; status: string; error: string }>
}

type CiShardSummaryModule = {
  walkSuites: (suites: unknown, filePrefix: string, out: PlaywrightFailure[]) => void
  isHookStepId: (stepId: string) => boolean
  parseCucumberFailures: (filePath: string) => Promise<CucumberFailure[]>
  buildMarkdown: (playwrightFailures: PlaywrightFailure[], cucumberFailures: CucumberFailure[]) => string
}

async function loadModule(): Promise<CiShardSummaryModule> {
  const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'ci-shard-summary.mjs')
  return (await import(pathToFileURL(scriptPath).href)) as CiShardSummaryModule
}

test.describe('ci-shard-summary helpers', () => {
  test('walkSuites extracts nested failed and timed out Playwright results', async () => {
    const { walkSuites } = await loadModule()
    const failures: PlaywrightFailure[] = []

    walkSuites(
      [
        {
          title: 'features/payment/FirstPayment.feature',
          specs: [
            {
              title: 'happy path',
              tests: [{ results: [{ status: 'passed' }] }]
            }
          ],
          suites: [
            {
              title: 'checkout',
              specs: [
                {
                  title: 'declined card',
                  tests: [
                    {
                      results: [
                        { status: 'failed', error: { message: 'card declined' } },
                        { status: 'timedOut', errors: [{ message: 'waited too long' }] }
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
        title: 'features/payment/FirstPayment.feature › checkout › declined card',
        status: 'failed',
        message: 'card declined'
      },
      {
        title: 'features/payment/FirstPayment.feature › checkout › declined card',
        status: 'timedOut',
        message: 'waited too long'
      }
    ])
  })

  test('parseCucumberFailures ignores malformed lines and hook steps', async () => {
    const { parseCucumberFailures } = await loadModule()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
    const messagesPath = path.join(dir, 'messages.ndjson')
    const envelopes = [
      { pickle: { id: 'pickle-1', name: 'Card decline shows CRM status', tags: [{ name: '@PDFEDITOR_PAYMENT' }], steps: [{ id: 'step-1', text: 'I upload a PDF' }, { id: 'step-2', text: 'I pay with a declined card' }] } },
      { testCase: { id: 'case-1', pickleId: 'pickle-1' } },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1' } },
      { testStepFinished: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1', testStepResult: { status: 'FAILED', message: 'before hook failed' } } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-1' } },
      { testStepFinished: { testCaseStartedId: 'attempt-1', testStepId: 'step-1', testStepResult: { status: 'PASSED' } } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'step-2' } },
      { testStepFinished: { testCaseStartedId: 'attempt-1', testStepId: 'step-2', testStepResult: { status: 'FAILED', message: 'raw failure', exception: { message: 'Stripe declined | insufficient funds' } } } },
      { testCaseFinished: { testCaseStartedId: 'attempt-1', testCaseResult: { status: 'FAILED' } } }
    ]
    fs.writeFileSync(messagesPath, ['not json', '', ...envelopes.map((env) => JSON.stringify(env))].join('\n'))

    try {
      await expect(parseCucumberFailures(messagesPath)).resolves.toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Card decline shows CRM status',
          failedStep: 'I pay with a declined card',
          errorMessage: 'Stripe declined | insufficient funds',
          steps: [
            { text: 'I upload a PDF', status: 'PASSED', error: '' },
            { text: 'I pay with a declined card', status: 'FAILED', error: 'Stripe declined | insufficient funds' }
          ]
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('buildMarkdown escapes step table pipes and emits empty report fallback', async () => {
    const { buildMarkdown } = await loadModule()

    expect(buildMarkdown([], [])).toContain('No failed tests found in reports')

    const markdown = buildMarkdown(
      [{ title: 'suite › spec', status: 'failed', message: 'Expected value' }],
      [
        {
          tag: '@PDFHINT_SMOKE',
          scenarioName: 'PDFhint smoke',
          failedStep: 'I see A | B',
          errorMessage: 'A | B mismatch',
          steps: [{ text: 'I see A | B', status: 'FAILED', error: 'A | B mismatch' }]
        }
      ]
    )

    expect(markdown).toContain('| I see A \\| B | FAILED |')
    expect(markdown).toContain('#### suite › spec')
    expect(markdown).toContain('Expected value')
    expect(markdown).toContain('Artifacts: failure screenshots')
  })
})
