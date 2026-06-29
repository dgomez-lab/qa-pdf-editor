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
  test('resolves Cucumber runtime step IDs to readable Gherkin text', async () => {
    const { dir, filePath } = writeMessages([
      {
        pickle: {
          id: 'pickle-1',
          name: 'Checkout validates the card',
          tags: [{ name: '@misc' }, { name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'pickle-step-pass', text: 'I open the payment modal' },
            { id: 'pickle-step-fail', text: 'I submit A|B card' }
          ]
        }
      },
      {
        testCase: {
          id: 'case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'hook-before-test-case-1' },
            { id: 'runtime-step-1', pickleStepId: 'pickle-step-pass' },
            { id: 'runtime-step-2', pickleStepId: 'pickle-step-fail' }
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
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'runtime-step-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'runtime-step-2' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-2',
          testStepResult: {
            status: 'FAILED',
            message: 'generic failure',
            exception: { message: 'decline details' }
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
          scenarioName: 'Checkout validates the card',
          failedStep: 'I submit A|B card',
          errorMessage: 'decline details',
          steps: [
            { text: 'I open the payment modal', status: 'PASSED', error: '' },
            { text: 'I submit A|B card', status: 'FAILED', error: 'decline details' }
          ]
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('collects nested Playwright failures without including passing results', () => {
    const out = []

    walkSuites(
      [
        {
          title: 'features/payment',
          suites: [
            {
              title: 'FirstPayment.feature',
              specs: [
                {
                  title: 'declined card',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'timedOut', error: { stack: 'Timed out waiting for payment iframe' } }
                      ]
                    }
                  ]
                },
                {
                  title: 'missing confirmation',
                  tests: [
                    {
                      results: [
                        { status: 'failed', errors: [{ message: 'Confirmation email was not received' }] }
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
      out
    )

    expect(out).toEqual([
      {
        title: 'features/payment › FirstPayment.feature › declined card',
        status: 'timedOut',
        message: 'Timed out waiting for payment iframe'
      },
      {
        title: 'features/payment › FirstPayment.feature › missing confirmation',
        status: 'failed',
        message: 'Confirmation email was not received'
      }
    ])
  })

  test('formats shard markdown with escaped Gherkin table cells', () => {
    const markdown = buildMarkdown(
      [{ title: 'payment › decline', message: 'Card declined' }],
      [
        {
          tag: '@PDFHINT_PAYMENT',
          failedStep: 'I submit A|B card',
          errorMessage: 'decline details',
          steps: [{ text: 'I submit A|B card', status: 'FAILED' }]
        }
      ],
      'Shard 2/4'
    )

    expect(markdown).toContain('## Shard 2/4 — failed tests')
    expect(markdown).toContain('| I submit A\\|B card | FAILED |')
    expect(markdown).toContain('#### payment › decline')
    expect(markdown).toContain('Card declined')
  })
})
