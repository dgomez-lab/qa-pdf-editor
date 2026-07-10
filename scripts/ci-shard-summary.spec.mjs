import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildMarkdown, parseCucumberFailures } from './ci-shard-summary.mjs'

function writeMessages(envelopes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-shard-summary-'))
  const filePath = path.join(dir, 'messages.ndjson')
  fs.writeFileSync(filePath, envelopes.map((env) => (typeof env === 'string' ? env : JSON.stringify(env))).join('\n'))
  return { dir, filePath }
}

test.describe('ci-shard-summary Cucumber parsing', () => {
  test('resolves runtime test step ids and filters hook steps from failures', async () => {
    const { dir, filePath } = writeMessages([
      {
        pickle: {
          id: 'pickle-payment',
          name: 'Declined payment shows the CRM status',
          tags: [{ name: '@PDFEDITOR_PAYMENT' }],
          steps: [
            { id: 'pickle-enter-card', text: 'I enter a declined card' },
            { id: 'pickle-see-status', text: 'I see a declined | payment notice' }
          ]
        }
      },
      {
        testCase: {
          id: 'test-case-payment',
          pickleId: 'pickle-payment',
          testSteps: [
            { id: 'runtime-before-test-case-1', hookId: 'before-hook' },
            { id: 'runtime-enter-card', pickleStepId: 'pickle-enter-card' },
            { id: 'runtime-see-status', pickleStepId: 'pickle-see-status' },
            { id: 'runtime-after-test-case-1', hookId: 'after-hook' }
          ]
        }
      },
      { testCaseStarted: { id: 'attempt-payment', testCaseId: 'test-case-payment' } },
      { testStepStarted: { testCaseStartedId: 'attempt-payment', testStepId: 'runtime-before-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-before-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-payment', testStepId: 'runtime-enter-card' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-enter-card',
          testStepResult: { status: 'PASSED' }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-payment', testStepId: 'runtime-see-status' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-see-status',
          testStepResult: { status: 'FAILED', exception: { message: 'Stripe decline was not shown' } }
        }
      },
      { testStepStarted: { testCaseStartedId: 'attempt-payment', testStepId: 'runtime-after-test-case-1' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-payment',
          testStepId: 'runtime-after-test-case-1',
          testStepResult: { status: 'PASSED' }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-payment',
          testCaseResult: { status: 'FAILED' }
        }
      }
    ])

    try {
      const failures = await parseCucumberFailures(filePath)
      expect(failures).toEqual([
        {
          tag: '@PDFEDITOR_PAYMENT',
          scenarioName: 'Declined payment shows the CRM status',
          failedStep: 'I see a declined | payment notice',
          errorMessage: 'Stripe decline was not shown',
          steps: [
            { text: 'I enter a declined card', status: 'PASSED', error: '' },
            { text: 'I see a declined | payment notice', status: 'FAILED', error: 'Stripe decline was not shown' }
          ]
        }
      ])

      const markdown = buildMarkdown([], failures)
      expect(markdown).toContain('- **@PDFEDITOR_PAYMENT** — `I see a declined | payment notice`')
      expect(markdown).toContain('| I see a declined \\| payment notice | FAILED |')
      expect(markdown).not.toContain('runtime-before-test-case-1')
      expect(markdown).not.toContain('runtime-after-test-case-1')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('falls back to runtime ids when pickle metadata is unavailable', async () => {
    const { dir, filePath } = writeMessages([
      'not-json',
      {
        testCase: {
          id: 'test-case-without-pickle',
          pickleId: 'missing-pickle',
          testSteps: [{ id: 'runtime-unmapped-step' }]
        }
      },
      { testCaseStarted: { id: 'attempt-unmapped', testCaseId: 'test-case-without-pickle' } },
      { testStepStarted: { testCaseStartedId: 'attempt-unmapped', testStepId: 'runtime-unmapped-step' } },
      {
        testStepFinished: {
          testCaseStartedId: 'attempt-unmapped',
          testStepId: 'runtime-unmapped-step',
          testStepResult: { status: 'FAILED', message: 'Unmapped failure' }
        }
      },
      {
        testCaseFinished: {
          testCaseStartedId: 'attempt-unmapped',
          testCaseResult: { status: 'FAILED' }
        }
      }
    ])

    try {
      expect(await parseCucumberFailures(filePath)).toEqual([
        {
          tag: '',
          scenarioName: 'test-case-without-pickle',
          failedStep: 'runtime-unmapped-step',
          errorMessage: 'Unmapped failure',
          steps: [{ text: 'runtime-unmapped-step', status: 'FAILED', error: 'Unmapped failure' }]
        }
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
