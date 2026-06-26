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

test.describe('ci shard summary helpers', () => {
  test('collects failed and timed out Playwright results from nested suites', () => {
    const failures = []
    walkSuites(
      [
        {
          title: 'root.spec.ts',
          specs: [],
          suites: [
            {
              title: 'checkout flow',
              specs: [
                {
                  title: 'submits card',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'failed', error: { message: 'card declined' } }
                      ]
                    }
                  ]
                },
                {
                  title: 'waits for receipt',
                  tests: [{ results: [{ status: 'timedOut', errors: [{ message: 'receipt timeout' }] }] }]
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
        title: 'root.spec.ts › checkout flow › submits card',
        status: 'failed',
        message: 'card declined'
      },
      {
        title: 'root.spec.ts › checkout flow › waits for receipt',
        status: 'timedOut',
        message: 'receipt timeout'
      }
    ])
  })

  test('parses Cucumber failures with readable step text and filters hooks', async () => {
    const { dir, filePath } = writeNdjson([
      {
        pickle: {
          id: 'pickle-1',
          name: 'Successful payment',
          tags: [{ name: '@smoke' }, { name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'pickle-step-1', text: 'I open checkout' },
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
            message: 'generic failure',
            exception: { message: 'card iframe did not load' }
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
      expect(await parseCucumberFailures(filePath)).toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Successful payment',
          failedStep: 'I pay with card',
          errorMessage: 'card iframe did not load',
          steps: [
            { text: 'I open checkout', status: 'PASSED', error: '' },
            { text: 'I pay with card', status: 'FAILED', error: 'card iframe did not load' }
          ]
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('builds markdown with escaped Cucumber table pipes and Playwright details', () => {
    const markdown = buildMarkdown(
      [{ title: 'payment.spec.ts › retries charge', status: 'failed', message: 'retry failed' }],
      [
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Payment',
          failedStep: 'I submit card | retry',
          errorMessage: 'declined | retry',
          steps: [{ text: 'I submit card | retry', status: 'FAILED', error: 'declined | retry' }]
        }
      ]
    )

    expect(markdown).toContain('| I submit card \\| retry | FAILED |')
    expect(markdown).toContain('#### payment.spec.ts › retries charge')
    expect(markdown).toContain('retry failed')
  })

  test('builds an empty-report fallback when no failures are found', () => {
    expect(buildMarkdown([], [])).toContain('No failed tests found in reports')
  })
})
