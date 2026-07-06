import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import {
  buildMarkdown as buildFastMarkdown,
  parseCucumberFailures as parseFastCucumberFailures,
  walkSuites as walkFastSuites
} from './ci-fast-summary.mjs'
import {
  buildMarkdown as buildShardMarkdown,
  parseCucumberFailures as parseShardCucumberFailures,
  walkSuites as walkShardSuites
} from './ci-shard-summary.mjs'

const failureMessages = [
  {
    pickle: {
      id: 'pickle-1',
      uri: 'features/payment/FirstPayment.feature',
      name: 'Payment failure summary',
      tags: [{ name: '@SMOKE' }, { name: '@PDFEDITOR_PAYMENT_FAILURE' }],
      steps: [
        { id: 'pickle-step-open', text: 'Given the checkout page is open' },
        { id: 'pickle-step-pay', text: 'Then the plan | amount is declined' }
      ]
    }
  },
  {
    testCase: {
      id: 'case-1',
      pickleId: 'pickle-1',
      testSteps: [
        { id: 'case-step-open', pickleStepId: 'pickle-step-open' },
        { id: 'case-step-pay', pickleStepId: 'pickle-step-pay' }
      ]
    }
  },
  { testCaseStarted: { id: 'attempt-1', testCaseId: 'case-1' } },
  { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'fixture-before-test-case-run-1' } },
  {
    testStepFinished: {
      testCaseStartedId: 'attempt-1',
      testStepId: 'fixture-before-test-case-run-1',
      testStepResult: { status: 'PASSED' }
    }
  },
  { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-step-open' } },
  {
    testStepFinished: {
      testCaseStartedId: 'attempt-1',
      testStepId: 'case-step-open',
      testStepResult: { status: 'PASSED' }
    }
  },
  { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'case-step-pay' } },
  {
    testStepFinished: {
      testCaseStartedId: 'attempt-1',
      testStepId: 'case-step-pay',
      testStepResult: {
        status: 'FAILED',
        message: 'generic decline message',
        exception: { message: 'Stripe decline code: insufficient_funds' }
      }
    }
  },
  { testCaseFinished: { testCaseStartedId: 'attempt-1', testCaseResult: { status: 'FAILED' } } }
]

function writeMessages(filePath, messages) {
  const ndjson = [
    '',
    'not json',
    ...messages.map((message) => JSON.stringify(message))
  ].join('\n')
  fs.writeFileSync(filePath, ndjson)
}

test.describe('CI summary scripts', () => {
  test('extract Cucumber failed steps without hook noise', async ({}, testInfo) => {
    const filePath = testInfo.outputPath('messages.ndjson')
    writeMessages(filePath, failureMessages)

    const fastFailures = await parseFastCucumberFailures(filePath)
    expect(fastFailures).toEqual([
      {
        tag: '@PDFEDITOR_PAYMENT_FAILURE',
        scenarioName: 'Payment failure summary',
        failedStep: 'Then the plan | amount is declined',
        errorMessage: 'Stripe decline code: insufficient_funds'
      }
    ])

    const shardFailures = await parseShardCucumberFailures(filePath)
    expect(shardFailures).toEqual([
      {
        tag: '@PDFEDITOR_PAYMENT_FAILURE',
        scenarioName: 'Payment failure summary',
        failedStep: 'Then the plan | amount is declined',
        errorMessage: 'Stripe decline code: insufficient_funds',
        steps: [
          {
            text: 'Given the checkout page is open',
            status: 'PASSED',
            error: ''
          },
          {
            text: 'Then the plan | amount is declined',
            status: 'FAILED',
            error: 'Stripe decline code: insufficient_funds'
          }
        ]
      }
    ])

    const fastMarkdown = buildFastMarkdown([], fastFailures)
    expect(fastMarkdown).toContain('- **@PDFEDITOR_PAYMENT_FAILURE** — `Then the plan | amount is declined`')
    expect(fastMarkdown).toContain('Stripe decline code: insufficient_funds')
    expect(fastMarkdown).not.toContain('fixture-before-test-case-run')
    expect(fastMarkdown).not.toContain('case-step-pay')

    const shardMarkdown = buildShardMarkdown([], shardFailures)
    expect(shardMarkdown).toContain('| Given the checkout page is open | PASSED |')
    expect(shardMarkdown).toContain('| Then the plan \\| amount is declined | FAILED |')
    expect(shardMarkdown).toContain('Stripe decline code: insufficient_funds')
    expect(shardMarkdown).not.toContain('fixture-before-test-case-run')
    expect(shardMarkdown).not.toContain('case-step-pay')
  })

  test('walkSuites reports failed and timed out Playwright attempts', () => {
    const suites = [
      {
        title: 'playwright-report',
        specs: [
          {
            title: 'keeps passing result out of summaries',
            tests: [{ results: [{ status: 'passed' }] }]
          }
        ],
        suites: [
          {
            title: 'seo.spec.ts',
            specs: [
              {
                title: 'absolute hrefs',
                tests: [
                  {
                    results: [
                      { status: 'failed', error: { message: 'Expected absolute URL' } },
                      { status: 'timedOut', errors: [{ message: 'Timed out waiting for hydration' }] }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]

    for (const walkSuites of [walkFastSuites, walkShardSuites]) {
      const failures = []
      walkSuites(suites, '', failures)
      expect(failures).toEqual([
        {
          title: 'playwright-report › seo.spec.ts › absolute hrefs',
          status: 'failed',
          message: 'Expected absolute URL'
        },
        {
          title: 'playwright-report › seo.spec.ts › absolute hrefs',
          status: 'timedOut',
          message: 'Timed out waiting for hydration'
        }
      ])
    }
  })
})
