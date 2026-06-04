import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

type FailureStep = { text: string; status: string; error?: string }
type CucumberFailure = {
  tag: string
  scenarioName: string
  failedStep: string
  errorMessage: string
  steps?: FailureStep[]
}
type PlaywrightFailure = { title: string; status: string; message: string }
type CiShardSummaryModule = {
  walkSuites: (suites: unknown, filePrefix: string, out: PlaywrightFailure[]) => void
  isHookStepId: (stepId: string) => boolean
  parseCucumberFailures: (filePath: string) => Promise<CucumberFailure[]>
  buildMarkdown: (playwrightFailures: PlaywrightFailure[], cucumberFailures: CucumberFailure[]) => string
}

const importModule = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<CiShardSummaryModule>

let summary: CiShardSummaryModule

test.beforeAll(async () => {
  summary = await importModule(pathToFileURL(path.join(process.cwd(), 'scripts', 'ci-shard-summary.mjs')).href)
})

test.describe('ci-shard-summary helpers', () => {
  test('walkSuites collects nested failed and timed-out Playwright results', () => {
    const failures: PlaywrightFailure[] = []

    summary.walkSuites(
      [
        {
          title: 'chromium',
          suites: [
            {
              title: 'checkout.spec.ts',
              specs: [
                {
                  title: 'successful payment',
                  tests: [{ results: [{ status: 'passed' }] }]
                },
                {
                  title: 'declined payment',
                  tests: [{ results: [{ status: 'failed', error: { message: 'card declined' } }] }]
                },
                {
                  title: 'payment retry',
                  tests: [{ results: [{ status: 'timedOut', errors: [{ message: 'retry timeout' }] }] }]
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
        title: 'chromium › checkout.spec.ts › declined payment',
        status: 'failed',
        message: 'card declined'
      },
      {
        title: 'chromium › checkout.spec.ts › payment retry',
        status: 'timedOut',
        message: 'retry timeout'
      }
    ])
  })

  test('parseCucumberFailures ignores malformed lines and hook steps while preserving scenario context', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
    const filePath = path.join(dir, 'messages.ndjson')
    const messages = [
      {
        pickle: {
          id: 'pickle-1',
          name: 'Card decline is reported',
          tags: [{ name: '@OTHER' }, { name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'step-open', text: 'Given checkout is open' },
            { id: 'step-submit', text: 'When payment is submitted' }
          ]
        }
      },
      'not-json',
      { testCase: { id: 'case-1', pickleId: 'pickle-1' } },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'setup-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'setup-before-test-case-1',
          testStepResult: { status: 'FAILED', message: 'hook failed' }
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
          testStepResult: { status: 'FAILED', message: 'payment declined | insufficient funds' }
        }
      },
      { testCaseFinished: { testCaseStartedId: 'attempt-1', testCaseResult: { status: 'FAILED' } } }
    ]

    fs.writeFileSync(
      filePath,
      messages.map((message) => (typeof message === 'string' ? message : JSON.stringify(message))).join('\n')
    )

    try {
      await expect(summary.parseCucumberFailures(filePath)).resolves.toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Card decline is reported',
          failedStep: 'When payment is submitted',
          errorMessage: 'payment declined | insufficient funds',
          steps: [
            { text: 'Given checkout is open', status: 'PASSED', error: '' },
            {
              text: 'When payment is submitted',
              status: 'FAILED',
              error: 'payment declined | insufficient funds'
            }
          ]
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('buildMarkdown escapes table pipes and renders an actionable empty-report fallback', () => {
    const withFailures = summary.buildMarkdown([], [
      {
        tag: '@PDFEDITOR_PAYMENT',
        scenarioName: 'Payment fails clearly',
        failedStep: 'Then the error is shown',
        errorMessage: 'Expected visible decline copy',
        steps: [{ text: 'Then copy contains A | B', status: 'FAILED', error: '' }]
      }
    ])

    expect(withFailures).toContain('- **@PDFEDITOR_PAYMENT** — `Then the error is shown`')
    expect(withFailures).toContain('| Then copy contains A \\| B | FAILED |')
    expect(withFailures).toContain('Expected visible decline copy')

    expect(summary.buildMarkdown([], [])).toContain('No failed tests found in reports (check job log).')
  })
})
