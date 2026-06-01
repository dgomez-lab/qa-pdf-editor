import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const repoRoot = path.resolve(__dirname, '../..')
const playwrightReportDir = path.join(repoRoot, 'playwright-report')
const cucumberReportDir = path.join(repoRoot, 'cucumber-report')

function resetReportDirs() {
  fs.rmSync(playwrightReportDir, { recursive: true, force: true })
  fs.rmSync(cucumberReportDir, { recursive: true, force: true })
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function writeNdjson(filePath: string, envelopes: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${envelopes.map((env) => JSON.stringify(env)).join('\n')}\n`)
}

function runShardSummary(summaryPath: string) {
  return execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'ci-shard-summary.mjs')], {
    cwd: repoRoot,
    env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath, SHARD_LABEL: 'Functional shard 3' },
    encoding: 'utf8'
  })
}

test.describe('ci-shard-summary', () => {
  test.beforeEach(resetReportDirs)
  test.afterEach(resetReportDirs)

  test('summarizes readable Cucumber and Playwright failures', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
    const summaryPath = path.join(dir, 'summary.md')

    try {
      writeJson(path.join(playwrightReportDir, 'results.json'), {
        suites: [
          {
            title: 'features/payment/FirstPayment.feature',
            specs: [
              {
                title: 'Payment retry',
                tests: [
                  {
                    results: [
                      {
                        status: 'timedOut',
                        error: { message: 'Timeout waiting for checkout' }
                      },
                      { status: 'passed' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })
      writeNdjson(path.join(cucumberReportDir, 'messages.ndjson'), [
        {
          pickle: {
            id: 'pickle-1',
            name: 'Successful first payment',
            tags: [{ name: '@smoke' }, { name: '@PDFEDITOR_PAYMENT_RANDOM_CARD' }],
            steps: [
              { id: 'pickle-step-1', text: 'I pay with card | Mastercard' },
              { id: 'pickle-step-2', text: 'I see the receipt' }
            ]
          }
        },
        {
          testCase: {
            id: 'case-1',
            pickleId: 'pickle-1',
            testSteps: [
              { id: 'hook-before-test-case-1' },
              { id: 'case-step-1', pickleStepId: 'pickle-step-1' },
              { id: 'case-step-2', pickleStepId: 'pickle-step-2' }
            ]
          }
        },
        { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
        { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1' } },
        {
          testStepFinished: {
            testCaseStartedId: 'attempt-1',
            testStepId: 'hook-before-test-case-1',
            testStepResult: { status: 'PASSED' }
          }
        },
        { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-step-1' } },
        {
          testStepFinished: {
            testCaseStartedId: 'attempt-1',
            testStepId: 'case-step-1',
            testStepResult: {
              status: 'FAILED',
              exception: { message: 'Card declined before confirmation' }
            }
          }
        },
        { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-step-2' } },
        {
          testStepFinished: {
            testCaseStartedId: 'attempt-1',
            testStepId: 'case-step-2',
            testStepResult: { status: 'SKIPPED' }
          }
        },
        {
          testCaseFinished: {
            testCaseStartedId: 'attempt-1',
            testCaseResult: { status: 'FAILED' }
          }
        }
      ])

      const stdout = runShardSummary(summaryPath)
      const summary = fs.readFileSync(summaryPath, 'utf8')

      for (const output of [stdout, summary]) {
        expect(output).toContain('## Functional shard 3')
        expect(output).toContain('- **@PDFEDITOR_PAYMENT_RANDOM_CARD**')
        expect(output).toContain('`I pay with card | Mastercard`')
        expect(output).toContain('| I pay with card \\| Mastercard | FAILED |')
        expect(output).toContain('| I see the receipt | SKIPPED |')
        expect(output).toContain('Card declined before confirmation')
        expect(output).toContain('features/payment/FirstPayment.feature')
        expect(output).toContain('Payment retry')
        expect(output).toContain('Timeout waiting for checkout')
        expect(output).not.toContain('hook-before-test-case-1')
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('emits an explicit empty-report note', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
    const summaryPath = path.join(dir, 'summary.md')

    try {
      const stdout = runShardSummary(summaryPath)
      const summary = fs.readFileSync(summaryPath, 'utf8')

      for (const output of [stdout, summary]) {
        expect(output).toContain('## Functional shard 3')
        expect(output).toContain('No failed tests found in reports (check job log).')
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
