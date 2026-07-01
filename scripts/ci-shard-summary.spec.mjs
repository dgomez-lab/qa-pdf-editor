import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  buildMarkdown,
  parseCucumberFailures,
  walkSuites
} from './ci-shard-summary.mjs'

function writeMessages(envelopes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(filePath, envelopes.map((env) => JSON.stringify(env)).join('\n'))
  return { dir, filePath }
}

test.describe('ci-shard-summary', () => {
  test('maps Cucumber runtime test steps to readable Gherkin text', async () => {
    const { dir, filePath } = writeMessages([
      {
        pickle: {
          id: 'pickle-1',
          uri: 'features/payment/FirstPayment.feature',
          name: 'Rejected card shows an error',
          tags: [{ name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'pickle-step-1', text: 'I open checkout' },
            { id: 'pickle-step-2', text: 'I submit card | payment' }
          ]
        }
      },
      {
        testCase: {
          id: 'case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'case-before-test-case-1' },
            { id: 'case-step-1', pickleStepId: 'pickle-step-1' },
            { id: 'case-step-2', pickleStepId: 'pickle-step-2' }
          ]
        }
      },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'case-before-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-step-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'case-step-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-step-2' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'case-step-2',
          testStepResult: {
            status: 'FAILED',
            message: 'fallback decline',
            exception: { message: 'processor declined | card' }
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
      const failures = await parseCucumberFailures(filePath)

      expect(failures).toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Rejected card shows an error',
          failedStep: 'I submit card | payment',
          errorMessage: 'processor declined | card',
          steps: [
            { text: 'I open checkout', status: 'PASSED', error: '' },
            { text: 'I submit card | payment', status: 'FAILED', error: 'processor declined | card' }
          ]
        }
      ])

      const markdown = buildMarkdown([], failures)
      expect(markdown).toContain('- **@PDFEDITOR_PAYMENT**')
      expect(markdown).toContain('| I submit card \\| payment | FAILED |')
      expect(markdown).not.toContain('case-before-test-case-1')
      expect(markdown).not.toContain('case-step-2')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('collects failed and timed out Playwright results from nested suites', () => {
    const failures = []

    walkSuites(
      [
        {
          title: 'root',
          suites: [
            {
              title: 'inner',
              specs: [
                {
                  title: 'checkout smoke',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'timedOut', errors: [{ message: 'waited too long' }] }
                      ]
                    }
                  ]
                }
              ]
            }
          ],
          specs: [
            {
              title: 'top level failure',
              tests: [
                {
                  results: [
                    { status: 'failed', error: { message: 'expected payment banner' } }
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

    const separator = String.fromCharCode(8250)
    expect(failures).toEqual([
      {
        title: 'root ' + separator + ' top level failure',
        status: 'failed',
        message: 'expected payment banner'
      },
      {
        title: 'root ' + separator + ' inner ' + separator + ' checkout smoke',
        status: 'timedOut',
        message: 'waited too long'
      }
    ])
  })
})
