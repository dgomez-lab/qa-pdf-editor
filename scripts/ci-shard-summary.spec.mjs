import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import test from 'node:test'
import {
  buildMarkdown,
  parseCucumberFailures,
  walkSuites
} from './ci-shard-summary.mjs'

test('walkSuites collects nested failed and timed out results', () => {
  const failures = []
  walkSuites(
    [
      {
        title: 'Checkout',
        specs: [
          {
            title: 'card payment',
            tests: [
              {
                results: [
                  { status: 'passed' },
                  { status: 'failed', error: { message: ' payment declined ' } }
                ]
              }
            ]
          }
        ],
        suites: [
          {
            title: 'Retries',
            specs: [
              {
                title: 'slow confirmation',
                tests: [
                  {
                    results: [{ status: 'timedOut', error: { stack: 'timeout stack' } }]
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

  assert.deepEqual(failures, [
    {
      title: 'Checkout › card payment',
      status: 'failed',
      message: 'payment declined'
    },
    {
      title: 'Checkout › Retries › slow confirmation',
      status: 'timedOut',
      message: 'timeout stack'
    }
  ])
})

test('parseCucumberFailures ignores malformed input and hook failures', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  const envelopes = [
    {
      pickle: {
        id: 'pickle-1',
        name: 'Card payment is rejected',
        tags: [{ name: '@PAYMENT' }, { name: '@PDFEDITOR_PAYMENT_DECLINED' }],
        steps: [
          { id: 'given-step', text: 'Given a customer' },
          { id: 'failed-step', text: 'When payment is submitted' }
        ]
      }
    },
    { testCase: { id: 'case-1', pickleId: 'pickle-1' } },
    { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
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
        testStepResult: { status: 'FAILED', message: 'hook noise' }
      }
    },
    {
      testStepStarted: {
        testCaseStartedId: 'attempt-1',
        testStepId: 'given-step'
      }
    },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-1',
        testStepId: 'given-step',
        testStepResult: { status: 'PASSED' }
      }
    },
    {
      testStepStarted: {
        testCaseStartedId: 'attempt-1',
        testStepId: 'failed-step'
      }
    },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-1',
        testStepId: 'failed-step',
        testStepResult: {
          status: 'FAILED',
          message: 'generic failure',
          exception: { message: 'decline code mismatch' }
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

  try {
    fs.writeFileSync(
      filePath,
      ['not-json', '', ...envelopes.map((envelope) => JSON.stringify(envelope))].join('\n')
    )

    const failures = await parseCucumberFailures(filePath)

    assert.deepEqual(failures, [
      {
        tag: '@PDFEDITOR_PAYMENT_DECLINED',
        scenarioName: 'Card payment is rejected',
        failedStep: 'When payment is submitted',
        errorMessage: 'decline code mismatch',
        steps: [
          { text: 'Given a customer', status: 'PASSED', error: '' },
          {
            text: 'When payment is submitted',
            status: 'FAILED',
            error: 'decline code mismatch'
          }
        ]
      }
    ])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('buildMarkdown escapes step tables and includes report failures', () => {
  const markdown = buildMarkdown(
    [{ title: 'Checkout › card payment', status: 'failed', message: 'processor error' }],
    [
      {
        tag: '@PDFEDITOR_PAYMENT_DECLINED',
        scenarioName: 'Card payment is rejected',
        failedStep: 'When payment is submitted',
        errorMessage: 'decline code mismatch',
        steps: [{ text: 'Then status is failed | retryable', status: 'FAILED' }]
      }
    ]
  )

  assert.match(markdown, /^## Regression shard — failed tests/)
  assert.match(markdown, /\| Then status is failed \\\| retryable \| FAILED \|/)
  assert.match(markdown, /#### Checkout › card payment/)
  assert.match(markdown, /processor error/)
})

test('buildMarkdown reports an empty shard without inventing failures', () => {
  assert.equal(
    buildMarkdown([], []),
    '## Regression shard — failed tests\n\nNo failed tests found in reports (check job log).\n'
  )
})
