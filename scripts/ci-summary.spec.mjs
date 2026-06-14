import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  buildMarkdown as buildFastMarkdown,
  parseCucumberFailures as parseFastFailures,
  walkSuites as walkFastSuites
} from './ci-fast-summary.mjs'
import {
  buildMarkdown as buildShardMarkdown,
  parseCucumberFailures as parseShardFailures,
  walkSuites as walkShardSuites
} from './ci-shard-summary.mjs'

function writeNdjson(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-summary-'))
  const file = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(
    file,
    lines.map((line) => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n')
  )
  return { dir, file }
}

function cucumberFailureMessages() {
  return [
    'not-json',
    {
      pickle: {
        id: 'pickle-payment',
        name: 'Pays with a saved card',
        tags: [{ name: '@smoke' }, { name: '@PDFEDITOR_PAYMENT' }],
        steps: [
          { id: 'pickle-step-start', text: 'Given a shopper starts checkout' },
          { id: 'pickle-step-submit', text: 'When the shopper submits card | details' }
        ]
      }
    },
    {
      testCase: {
        id: 'case-payment',
        pickleId: 'pickle-payment',
        testSteps: [
          { id: 'hook-before-test-case-payment' },
          { id: 'runtime-step-start', pickleStepId: 'pickle-step-start' },
          { id: 'runtime-step-submit', pickleStepId: 'pickle-step-submit' }
        ]
      }
    },
    {
      testCaseStarted: {
        id: 'attempt-payment',
        testCaseId: 'case-payment'
      }
    },
    {
      testStepStarted: {
        testCaseStartedId: 'attempt-payment',
        testStepId: 'hook-before-test-case-payment'
      }
    },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-payment',
        testStepId: 'hook-before-test-case-payment',
        testStepResult: { status: 'PASSED' }
      }
    },
    {
      testStepStarted: {
        testCaseStartedId: 'attempt-payment',
        testStepId: 'runtime-step-start'
      }
    },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-payment',
        testStepId: 'runtime-step-start',
        testStepResult: { status: 'PASSED' }
      }
    },
    {
      testStepStarted: {
        testCaseStartedId: 'attempt-payment',
        testStepId: 'runtime-step-submit'
      }
    },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-payment',
        testStepId: 'runtime-step-submit',
        testStepResult: {
          status: 'FAILED',
          message: 'raw failure',
          exception: { message: 'Card network declined' }
        }
      }
    },
    {
      testCaseFinished: {
        testCaseStartedId: 'attempt-payment',
        testCaseResult: { status: 'FAILED' }
      }
    }
  ]
}

test('CI summary parsers report readable failed Gherkin steps', async () => {
  const { dir, file } = writeNdjson(cucumberFailureMessages())

  try {
    const shardFailures = await parseShardFailures(file)
    const fastFailures = await parseFastFailures(file)

    for (const failures of [shardFailures, fastFailures]) {
      expect(failures).toHaveLength(1)
      expect(failures[0]).toMatchObject({
        tag: '@PDFEDITOR_PAYMENT',
        scenarioName: 'Pays with a saved card',
        failedStep: 'When the shopper submits card | details',
        errorMessage: 'Card network declined'
      })
    }

    expect(shardFailures[0].steps.map((step) => step.text)).toEqual([
      'Given a shopper starts checkout',
      'When the shopper submits card | details'
    ])

    const shardMarkdown = buildShardMarkdown([], shardFailures)
    const fastMarkdown = buildFastMarkdown([], fastFailures)

    expect(shardMarkdown).toContain('| When the shopper submits card \\| details | FAILED |')
    expect(shardMarkdown).toContain('Card network declined')
    expect(shardMarkdown).not.toContain('hook-before-test-case-payment')
    expect(fastMarkdown).toContain('- **@PDFEDITOR_PAYMENT** — `When the shopper submits card | details`')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('CI summary suite walkers collect nested failed and timed out Playwright results', () => {
  const suites = [
    {
      title: 'features/payment.feature',
      specs: [
        {
          title: 'successful payment',
          tests: [
            {
              results: [
                { status: 'passed' },
                { status: 'failed', error: { message: 'Expected card form to be visible' } }
              ]
            }
          ]
        }
      ]
    },
    {
      title: 'nested root',
      suites: [
        {
          title: 'child describe',
          specs: [
            {
              title: 'slow SEO',
              tests: [
                {
                  results: [{ status: 'timedOut', errors: [{ message: 'Timed out after 30s' }] }]
                }
              ]
            }
          ]
        }
      ]
    }
  ]

  for (const walkSuites of [walkShardSuites, walkFastSuites]) {
    const failures = []
    walkSuites(suites, '', failures)

    expect(failures).toEqual([
      {
        title: 'features/payment.feature › successful payment',
        status: 'failed',
        message: 'Expected card form to be visible'
      },
      {
        title: 'nested root › child describe › slow SEO',
        status: 'timedOut',
        message: 'Timed out after 30s'
      }
    ])
  }
})
