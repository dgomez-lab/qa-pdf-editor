import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildMarkdown, parseCucumberFailures } from './ci-shard-summary.mjs'

test.describe('ci-shard-summary', () => {
  test('maps Cucumber runtime step ids to readable failed step text', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-shard-summary-'))
    const filePath = path.join(dir, 'messages.ndjson')
    const envelopes = [
      {
        pickle: {
          id: 'pickle-1',
          name: 'Download edited PDF',
          tags: [{ name: '@PDFEDITOR_DOWNLOAD' }],
          steps: [
            { id: 'pickle-step-upload', text: 'I upload a PDF' },
            { id: 'pickle-step-download', text: 'I download the result | safely' }
          ]
        }
      },
      {
        testCase: {
          id: 'case-1',
          pickleId: 'pickle-1',
          testSteps: [
            { id: 'hook-before-test-case-1' },
            { id: 'runtime-step-upload', pickleStepId: 'pickle-step-upload' },
            { id: 'runtime-step-download', pickleStepId: 'pickle-step-download' }
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
          testStepResult: { status: 'PASSED' }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-upload'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-upload',
          testStepResult: { status: 'PASSED' }
        }
      },
      {
        testStepStarted: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-download'
        }
      },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-1',
          testStepId: 'runtime-step-download',
          testStepResult: {
            status: 'FAILED',
            exception: { message: 'Download button remained disabled' }
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
    fs.writeFileSync(filePath, `not json\n${envelopes.map((env) => JSON.stringify(env)).join('\n')}\n`)

    try {
      const failures = await parseCucumberFailures(filePath)
      const markdown = buildMarkdown([], failures)

      expect(failures).toEqual([
        {
          tag: '@PDFEDITOR_DOWNLOAD',
          scenarioName: 'Download edited PDF',
          failedStep: 'I download the result | safely',
          errorMessage: 'Download button remained disabled',
          steps: [
            { text: 'I upload a PDF', status: 'PASSED', error: '' },
            {
              text: 'I download the result | safely',
              status: 'FAILED',
              error: 'Download button remained disabled'
            }
          ]
        }
      ])
      expect(markdown).toContain('- **@PDFEDITOR_DOWNLOAD** — `I download the result | safely`')
      expect(markdown).toContain('| I download the result \\| safely | FAILED |')
      expect(markdown).toContain('Download button remained disabled')
      expect(markdown).not.toContain('runtime-step-download')
      expect(markdown).not.toContain('hook-before-test-case-1')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
