import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test, expect } from '@playwright/test'
import {
  parseCucumberFailures as parseShardCucumberFailures,
  buildMarkdown as buildShardMarkdown,
  walkSuites as walkShardSuites
} from './ci-shard-summary.mjs'
import {
  parseCucumberFailures as parseFastCucumberFailures,
  buildMarkdown as buildFastMarkdown
} from './ci-fast-summary.mjs'

async function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-summary-'))
  try {
    return await fn(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function writeCucumberFailureFile(dir) {
  const file = path.join(dir, 'messages.ndjson')
  const envelopes = [
    {
      pickle: {
        id: 'pickle-1',
        uri: 'features/SEO.feature',
        name: 'SEO home header checks',
        tags: [{ name: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS' }],
        steps: [
          { id: 'pickle-step-1', text: 'every header link should have an absolute href' },
          { id: 'pickle-step-2', text: 'a table step with | pipe' }
        ]
      }
    },
    {
      testCase: {
        id: 'case-1',
        pickleId: 'pickle-1',
        testSteps: [
          { id: 'hook-before-test-case-1' },
          { id: 'test-step-1', pickleStepId: 'pickle-step-1' },
          { id: 'test-step-2', pickleStepId: 'pickle-step-2' }
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
    { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-1' } },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-1',
        testStepId: 'test-step-1',
        testStepResult: { status: 'FAILED', message: 'Expected absolute http(s) href' }
      }
    },
    { testStepStarted: { testCaseStartedId: 'attempt-1', testStepId: 'test-step-2' } },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-1',
        testStepId: 'test-step-2',
        testStepResult: { status: 'SKIPPED' }
      }
    },
    {
      testCaseFinished: {
        testCaseStartedId: 'attempt-1',
        testCaseResult: { status: 'FAILED' }
      }
    }
  ]
  fs.writeFileSync(file, `not-json\n\n${envelopes.map((env) => JSON.stringify(env)).join('\n')}\n`)
  return file
}

test.describe('CI summary scripts', () => {
  test('maps Cucumber testStepId values to readable Gherkin text', async () => {
    await withTempDir(async (dir) => {
      const file = writeCucumberFailureFile(dir)

      const shardFailures = await parseShardCucumberFailures(file)
      expect(shardFailures).toHaveLength(1)
      expect(shardFailures[0]).toMatchObject({
        tag: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS',
        scenarioName: 'SEO home header checks',
        failedStep: 'every header link should have an absolute href',
        errorMessage: 'Expected absolute http(s) href'
      })
      expect(shardFailures[0].steps).toEqual([
        {
          text: 'every header link should have an absolute href',
          status: 'FAILED',
          error: 'Expected absolute http(s) href'
        },
        { text: 'a table step with | pipe', status: 'SKIPPED', error: '' }
      ])

      const shardMarkdown = buildShardMarkdown([], shardFailures, 'Regression shard 3')
      expect(shardMarkdown).toContain('## Regression shard 3 — failed tests')
      expect(shardMarkdown).toContain('- **@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS** — `every header link should have an absolute href`')
      expect(shardMarkdown).toContain('| a table step with \\| pipe | SKIPPED |')
      expect(shardMarkdown).not.toContain('test-step-1')
      expect(shardMarkdown).not.toContain('hook-before-test-case-1')

      const fastFailures = await parseFastCucumberFailures(file)
      expect(fastFailures).toHaveLength(1)
      expect(fastFailures[0]).toMatchObject({
        tag: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS',
        scenarioName: 'SEO home header checks',
        failedStep: 'every header link should have an absolute href',
        errorMessage: 'Expected absolute http(s) href'
      })

      const fastMarkdown = buildFastMarkdown([], fastFailures)
      expect(fastMarkdown).toContain('- **@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS** — `every header link should have an absolute href`')
      expect(fastMarkdown).not.toContain('test-step-1')
      expect(fastMarkdown).not.toContain('hook-before-test-case-1')
    })
  })

  test('walks nested Playwright result suites and reports failed attempts only', () => {
    const failures = []

    walkShardSuites(
      [
        {
          title: 'features/SEO.feature',
          suites: [
            {
              title: 'SEO checks',
              specs: [
                {
                  title: 'absolute hrefs',
                  tests: [
                    {
                      results: [
                        { status: 'passed' },
                        { status: 'timedOut', error: { message: 'Timed out waiting for header' } }
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
        title: 'features/SEO.feature › SEO checks › absolute hrefs',
        status: 'timedOut',
        message: 'Timed out waiting for header'
      }
    ])
  })
})
