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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-ci-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  const lines = ['', '{not valid json}', ...envelopes.map((env) => JSON.stringify(env))]
  fs.writeFileSync(filePath, lines.join('\n'))
  return { dir, filePath }
}

test.describe('ci-shard-summary', () => {
  test('maps cucumber runtime step ids to readable gherkin text and filters hooks', async () => {
    const { dir, filePath } = writeMessages([
      {
        testCase: {
          id: 'case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'hook-before-test-case-1' },
            { id: 'runtime-step-card', pickleStepId: 'pickle-step-card' },
            { id: 'runtime-step-submit', pickleStepId: 'pickle-step-submit' }
          ]
        }
      },
      {
        pickle: {
          id: 'pickle-1',
          name: 'Payment decline shows validation',
          tags: [{ name: '@smoke' }, { name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'pickle-step-card', text: 'enter card | number' },
            { id: 'pickle-step-submit', text: 'submit payment' }
          ]
        }
      },
      {
        testCaseStarted: {
          id: 'attempt-1',
          testCaseId: 'case-1'
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'hook-before-test-case-1'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'hook-before-test-case-1',
          testStepResult: {
            status: 'FAILED',
            message: 'hook failure'
          }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-card'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-card',
          testStepResult: {
            status: 'PASSED'
          }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-submit'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-submit',
          testStepResult: {
            status: 'FAILED',
            message: 'generic failure',
            exception: { message: 'Issuer declined card' }
          }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-1',
          testCaseResult: {
            status: 'FAILED'
          }
        }
      }
    ])

    try {
      const failures = await parseCucumberFailures(filePath)
      expect(failures).toHaveLength(1)
      expect(failures[0]).toEqual({
        tag: '@PDFEDITOR_PAYMENT',
        scenarioName: 'Payment decline shows validation',
        failedStep: 'submit payment',
        errorMessage: 'Issuer declined card',
        steps: [
          { text: 'enter card | number', status: 'PASSED', error: '' },
          { text: 'submit payment', status: 'FAILED', error: 'Issuer declined card' }
        ]
      })

      const markdown = buildMarkdown([], failures)
      expect(markdown).toContain('### Gherkin steps')
      expect(markdown).toContain('| enter card \\| number | PASSED |')
      expect(markdown).toContain('Issuer declined card')
      expect(markdown).not.toContain('hook failure')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('walks nested Playwright suites and reports failed or timed out results', () => {
    const failures = []
    walkSuites(
      [
        {
          title: 'root',
          specs: [
            {
              title: 'spec A',
              tests: [
                {
                  results: [
                    { status: 'passed' },
                    { status: 'failed', error: { message: 'Expected A' } }
                  ]
                }
              ]
            }
          ],
          suites: [
            {
              title: 'nested',
              specs: [
                {
                  title: 'spec B',
                  tests: [
                    {
                      results: [
                        { status: 'timedOut', errors: [{ message: 'Timed out waiting' }] }
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

    expect(failures).toHaveLength(2)
    expect(failures[0].title).toContain('root')
    expect(failures[0].title).toContain('spec A')
    expect(failures[0].status).toBe('failed')
    expect(failures[0].message).toBe('Expected A')
    expect(failures[1].title).toContain('nested')
    expect(failures[1].title).toContain('spec B')
    expect(failures[1].status).toBe('timedOut')
    expect(failures[1].message).toBe('Timed out waiting')
  })

  test('builds an actionable empty summary when no failures are parsed', () => {
    const markdown = buildMarkdown([], [])
    expect(markdown).toContain('## Regression shard')
    expect(markdown).toContain('No failed tests found in reports')
  })
})
