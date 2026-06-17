import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

const root = path.resolve(__dirname, '..')
const scriptPath = path.join(root, 'scripts', 'ci-shard-summary.mjs')
const playwrightReportDir = path.join(root, 'playwright-report')
const cucumberReportDir = path.join(root, 'cucumber-report')
const summaryPath = path.join(root, 'test-results', 'ci-shard-summary.md')

function cleanReports(): void {
  fs.rmSync(playwrightReportDir, { recursive: true, force: true })
  fs.rmSync(cucumberReportDir, { recursive: true, force: true })
  fs.rmSync(summaryPath, { force: true })
}

function runSummary(env: Record<string, string> = {}) {
  const childEnv = { ...process.env }
  delete childEnv.GITHUB_STEP_SUMMARY
  delete childEnv.SHARD_LABEL

  return spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    env: { ...childEnv, ...env },
    encoding: 'utf8'
  })
}

test.describe('ci-shard-summary', () => {
  test.beforeEach(cleanReports)
  test.afterEach(cleanReports)

  test('reports readable Cucumber steps and nested Playwright failures', () => {
    fs.mkdirSync(playwrightReportDir, { recursive: true })
    fs.mkdirSync(cucumberReportDir, { recursive: true })
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true })

    fs.writeFileSync(
      path.join(playwrightReportDir, 'results.json'),
      JSON.stringify({
        suites: [
          {
            title: 'features/payment.feature',
            specs: [
              {
                title: 'card decline',
                tests: [
                  {
                    results: [
                      {
                        status: 'timedOut',
                        errors: [{ message: 'Timed out waiting for payment intent' }]
                      }
                    ]
                  }
                ]
              }
            ],
            suites: [
              {
                title: 'nested checkout',
                specs: [
                  {
                    title: 'download after payment',
                    tests: [
                      {
                        results: [
                          {
                            status: 'failed',
                            error: { message: 'Download button missing' }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })
    )

    const envelopes = [
      {
        pickle: {
          id: 'pickle-1',
          name: 'Payment scenario',
          tags: [{ name: '@PDFEDITOR_PAYMENT' }, { name: '@slow' }],
          steps: [
            { id: 'pickle-step-1', text: 'I open pricing | checkout' },
            { id: 'pickle-step-2', text: 'I pay with card' }
          ]
        }
      },
      {
        testCase: {
          id: 'test-case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'hook-before-test-case-1' },
            { id: 'test-step-1', pickleStepId: 'pickle-step-1' },
            { id: 'test-step-2', pickleStepId: 'pickle-step-2' }
          ]
        }
      },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'test-case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'hook-before-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'test-step-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-2' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'test-step-2',
          testStepResult: {
            status: 'FAILED',
            message: 'Outer failure',
            exception: { message: 'Stripe declined in iframe' }
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

    fs.writeFileSync(
      path.join(cucumberReportDir, 'messages.ndjson'),
      envelopes.map((env) => JSON.stringify(env)).join('\n')
    )

    const result = runSummary({
      SHARD_LABEL: 'Nightly shard 2',
      GITHUB_STEP_SUMMARY: summaryPath
    })

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('## Nightly shard 2 \\u2014 failed tests'.replace('\\u2014', '\u2014'))
    expect(result.stdout).toContain('- **@PDFEDITOR_PAYMENT** \\u2014 `I pay with card`'.replace('\\u2014', '\u2014'))
    expect(result.stdout).toContain('| I open pricing \\| checkout | PASSED |')
    expect(result.stdout).toContain('| I pay with card | FAILED |')
    expect(result.stdout).toContain('Stripe declined in iframe')
    expect(result.stdout).not.toContain('hook-before-test-case-1')
    expect(result.stdout).not.toContain('test-step-2')
    expect(result.stdout).toContain('#### features/payment.feature \\u203a card decline'.replace('\\u203a', '\u203a'))
    expect(result.stdout).toContain('Timed out waiting for payment intent')
    expect(result.stdout).toContain(
      '#### features/payment.feature \\u203a nested checkout \\u203a download after payment'
        .replaceAll('\\u203a', '\u203a')
    )
    expect(result.stdout).toContain('Download button missing')
    expect(fs.readFileSync(summaryPath, 'utf8').trimEnd()).toBe(result.stdout.trimEnd())
  })

  test('prints an actionable fallback when reports have no failures', () => {
    const result = runSummary()

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('## Regression shard \\u2014 failed tests'.replace('\\u2014', '\u2014'))
    expect(result.stdout).toContain('No failed tests found in reports (check job log).')
  })
})
