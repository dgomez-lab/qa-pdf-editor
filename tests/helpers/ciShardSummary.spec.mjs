import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildMarkdown, parseCucumberFailures, walkSuites } from '../../scripts/ci-shard-summary.mjs'

const tempDirs = []

test.afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function writeNdjson(envelopes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-ci-shard-summary-'))
  tempDirs.push(dir)
  const filePath = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(filePath, envelopes.map((env) => JSON.stringify(env)).join('\n'))
  return filePath
}

test.describe('ci-shard-summary', () => {
  test('parses failed cucumber attempts with readable steps and exception precedence', async () => {
    const filePath = writeNdjson([
      {
        pickle: {
          id: 'pickle-1',
          name: 'Declined payment reports a useful error',
          tags: [{ name: '@SMOKE' }, { name: '@PDFHINT_PAYMENT_DECLINE' }],
          steps: [
            { id: 'step-open', text: 'Open checkout' },
            { id: 'step-submit', text: 'Submit declined card' }
          ]
        }
      },
      { testCase: { id: 'case-1', pickleId: 'pickle-1' } },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'setup-before-test-case-0' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'setup-before-test-case-0',
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
            message: 'outer failure message',
            exception: { message: 'processor declined the card' }
          }
        }
      },
      { testCaseFinished: { testCaseStartedId: 'attempt-1', testCaseResult: { status: 'FAILED' } } }
    ])

    const failures = await parseCucumberFailures(filePath)

    expect(failures).toEqual([
      {
        tag: '@PDFHINT_PAYMENT_DECLINE',
        scenarioName: 'Declined payment reports a useful error',
        failedStep: 'Submit declined card',
        errorMessage: 'processor declined the card',
        steps: [
          { text: 'Open checkout', status: 'PASSED', error: '' },
          { text: 'Submit declined card', status: 'FAILED', error: 'processor declined the card' }
        ]
      }
    ])
  })

  test('formats cucumber failures with escaped table cells and empty fallback', () => {
    const markdown = buildMarkdown(
      [],
      [
        {
          tag: '@PDFEDITOR_FORMS',
          scenarioName: 'Forms link remains readable',
          failedStep: 'Choose A | B',
          errorMessage: 'bad href',
          steps: [{ text: 'Choose A | B', status: 'FAILED', error: 'bad href' }]
        }
      ],
      'Shard 2'
    )

    expect(markdown).toContain('## Shard 2')
    expect(markdown).toContain('- **@PDFEDITOR_FORMS**')
    expect(markdown).toContain('| Choose A \\| B | FAILED |')
    expect(markdown).toContain('bad href')
    expect(buildMarkdown([], [], 'Shard 2')).toContain('No failed tests found in reports (check job log).')
  })

  test('collects nested failed and timed out playwright results', () => {
    const failures = []

    walkSuites(
      [
        {
          title: 'features/payment',
          suites: [
            {
              title: 'FirstPayment.feature',
              specs: [
                {
                  title: 'declines expired card',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'timedOut', errors: [{ message: 'Timed out waiting for Stripe frame' }] }
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

    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatchObject({
      status: 'timedOut',
      message: 'Timed out waiting for Stripe frame'
    })
    expect(failures[0].title).toContain('features/payment')
    expect(failures[0].title).toContain('FirstPayment.feature')
    expect(failures[0].title).toContain('declines expired card')
  })
})
