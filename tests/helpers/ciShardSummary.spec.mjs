import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import {
  buildMarkdown,
  parseCucumberFailures,
  walkSuites
} from '../../scripts/ci-shard-summary.mjs'

test.describe('ci-shard-summary helpers', () => {
  test('parseCucumberFailures maps Cucumber test step ids to readable pickle text', async ({}, testInfo) => {
    const filePath = testInfo.outputPath('messages.ndjson')
    const envelopes = [
      { pickle: { id: 'pickle-1', name: 'Header links are absolute', tags: [{ name: '@PDFEDITOR_SEO_HEADER' }, { name: '@slow' }], steps: [{ id: 'pickle-step-1', text: 'open the home page' }, { id: 'pickle-step-2', text: 'click bad | link' }] } },
      { testCase: { id: 'test-case-1', pickleId: 'pickle-1', testSteps: [{ id: 'hook-before-test-case-1' }, { id: 'test-step-1', pickleStepId: 'pickle-step-1' }, { id: 'test-step-2', pickleStepId: 'pickle-step-2' }] } },
      { testCaseStarted: { id: 'attempt-1', testCaseId: 'test-case-1' } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1' } },
      { testStepFinished: { testCaseStartedId: 'attempt-1', testStepId: 'hook-before-test-case-1', testStepResult: { status: 'PASSED' } } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-1' } },
      { testStepFinished: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-1', testStepResult: { status: 'PASSED' } } },
      { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-2' } },
      { testStepFinished: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-2', testStepResult: { status: 'FAILED', message: 'raw failure', exception: { message: 'assertion failure' } } } },
      { testCaseFinished: { testCaseStartedId: 'attempt-1', testCaseResult: { status: 'FAILED' } } }
    ]

    fs.writeFileSync(filePath, `${envelopes.map((env) => JSON.stringify(env)).join('\n')}\nnot-json\n`)

    const failures = await parseCucumberFailures(filePath)

    expect(failures).toEqual([
      {
        tag: '@PDFEDITOR_SEO_HEADER',
        scenarioName: 'Header links are absolute',
        failedStep: 'click bad | link',
        errorMessage: 'assertion failure',
        steps: [
          { text: 'open the home page', status: 'PASSED', error: '' },
          { text: 'click bad | link', status: 'FAILED', error: 'assertion failure' }
        ]
      }
    ])
  })

  test('walkSuites collects nested failed and timed out Playwright results', () => {
    const failures = []

    walkSuites(
      [
        {
          title: 'tests/example.spec.ts',
          suites: [
            {
              title: 'checkout',
              specs: [
                {
                  title: 'rejects bad card',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'failed', errors: [{ message: 'decline banner missing' }] }
                      ]
                    }
                  ]
                },
                {
                  title: 'does not hang',
                  tests: [{ results: [{ status: 'timedOut', error: { stack: 'timeout stack' } }] }]
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
        title: 'tests/example.spec.ts › checkout › rejects bad card',
        status: 'failed',
        message: 'decline banner missing'
      },
      {
        title: 'tests/example.spec.ts › checkout › does not hang',
        status: 'timedOut',
        message: 'timeout stack'
      }
    ])
  })

  test('buildMarkdown escapes step table pipes and reports empty artifacts', () => {
    expect(buildMarkdown([], [])).toContain('No failed tests found in reports')

    const markdown = buildMarkdown(
      [{ title: 'checkout flow', status: 'failed', message: 'stack trace' }],
      [
        {
          tag: '@PDFEDITOR_SEO_HEADER',
          scenarioName: 'Header links are absolute',
          failedStep: 'click bad | link',
          errorMessage: 'assertion failure',
          steps: [{ text: 'click bad | link', status: 'FAILED', error: 'assertion failure' }]
        }
      ]
    )

    expect(markdown).toContain('| click bad \\| link | FAILED |')
    expect(markdown).toContain('#### checkout flow')
    expect(markdown).toContain('Artifacts: failure screenshots')
  })
})
