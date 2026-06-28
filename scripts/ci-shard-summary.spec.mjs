import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildMarkdown, parseCucumberFailures, walkSuites } from './ci-shard-summary.mjs'

function writeNdjson(envelopes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(filePath, envelopes.map((env) => JSON.stringify(env)).join('\n') + '\n')
  return { dir, filePath }
}

test.describe('ci shard summary', () => {
  test('maps Cucumber testStep ids to readable failed Gherkin steps', async () => {
    const { dir, filePath } = writeNdjson([
      {
        pickle: {
          id: 'pickle-1',
          name: 'Home header absolute hrefs',
          tags: [{ name: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS' }],
          steps: [
            { id: 'pickle-step-1', text: 'the home page is loaded' },
            { id: 'pickle-step-2', text: 'the login link is absolute | encoded' }
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
            exception: { message: 'Expected login href to be absolute' }
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

      expect(failures).toHaveLength(1)
      expect(failures[0]).toMatchObject({
        tag: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS',
        scenarioName: 'Home header absolute hrefs',
        failedStep: 'the login link is absolute | encoded',
        errorMessage: 'Expected login href to be absolute'
      })
      expect(failures[0].steps).toEqual([
        { text: 'the home page is loaded', status: 'PASSED', error: '' },
        {
          text: 'the login link is absolute | encoded',
          status: 'FAILED',
          error: 'Expected login href to be absolute'
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('renders escaped shard markdown with Cucumber and Playwright failures', () => {
    const cucumberFailures = [
      {
        tag: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS',
        scenarioName: 'Home header absolute hrefs',
        failedStep: 'the login link is absolute | encoded',
        errorMessage: 'Expected login href to be absolute',
        steps: [
          { text: 'the home page is loaded', status: 'PASSED', error: '' },
          {
            text: 'the login link is absolute | encoded',
            status: 'FAILED',
            error: 'Expected login href to be absolute'
          }
        ]
      }
    ]
    const playwrightFailures = [
      {
        title: 'features/SEO.feature › Home header absolute hrefs',
        status: 'timedOut',
        message: 'Timed out waiting for hydrated navigation'
      }
    ]

    const markdown = buildMarkdown(playwrightFailures, cucumberFailures, 'Regression functional shard 3/10')

    expect(markdown).toContain('## Regression functional shard 3/10 — failed tests')
    expect(markdown).toContain('- **@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS** — `the login link is absolute | encoded`')
    expect(markdown).toContain('| the login link is absolute \\| encoded | FAILED |')
    expect(markdown).toContain('Expected login href to be absolute')
    expect(markdown).toContain('#### features/SEO.feature › Home header absolute hrefs')
    expect(markdown).toContain('Timed out waiting for hydrated navigation')
  })

  test('collects failed and timed out Playwright results from nested suites', () => {
    const failures = []

    walkSuites(
      [
        {
          title: 'features',
          suites: [
            {
              title: 'SEO.feature',
              specs: [
                {
                  title: 'Home header absolute hrefs',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'timedOut', errors: [{ message: 'hydration timeout' }] }
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

    expect(failures).toEqual([
      {
        title: 'features › SEO.feature › Home header absolute hrefs',
        status: 'timedOut',
        message: 'hydration timeout'
      }
    ])
  })
})
