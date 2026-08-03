import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { verifyMergeReport } from './verify-merge-report.mjs'

function writeNdjson(filePath, envelopes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, envelopes.map((env) => JSON.stringify(env)).join('\n') + '\n')
}

function seoHeaderEnvelopes() {
  return [
    {
      pickle: {
        id: 'pickle-seo',
        uri: 'features/SEO.feature',
        name: 'Home header absolute hrefs',
        tags: [{ name: '@PDFEDITOR_SEO' }, { name: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS' }],
        steps: [{ id: 'pickle-step-check', text: 'I check header absolute hrefs' }]
      }
    },
    {
      testCase: {
        id: 'case-seo',
        pickleId: 'pickle-seo',
        testSteps: [{ id: 'case-step-check', pickleStepId: 'pickle-step-check' }]
      }
    },
    { testCaseStarted: { id: 'attempt-seo', testCaseId: 'case-seo' } },
    { testStepStarted: { testCaseStartedId: 'attempt-seo', testStepId: 'case-step-check' } },
    {
      testStepFinished: {
        testCaseStartedId: 'attempt-seo',
        testStepId: 'case-step-check',
        testStepResult: { status: 'PASSED' }
      }
    },
    {
      testCaseFinished: {
        testCaseStartedId: 'attempt-seo',
        testCaseResult: { status: 'PASSED' }
      }
    }
  ]
}

function writeFixtureScreenshot(artifactsDir, testId = 'seo-header') {
  const screenshotDir = path.join(artifactsDir, 'failure-screenshots-shard-fixture')
  fs.mkdirSync(screenshotDir, { recursive: true })
  fs.writeFileSync(
    path.join(screenshotDir, 'manifest.ndjson'),
    JSON.stringify({
      testId,
      title: 'Home header absolute hrefs',
      tag: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS'
    }) + '\n'
  )
  fs.writeFileSync(path.join(screenshotDir, `${testId}.png`), Buffer.from('seo-png'))
  return screenshotDir
}

test.describe('verifyMergeReport', () => {
  test('accepts a shard fixture with readable steps and attaches the SEO failure screenshot', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-verify-merge-ok-'))
    try {
      writeNdjson(
        path.join(artifactsDir, 'cucumber-messages-shard-1', 'messages.ndjson'),
        seoHeaderEnvelopes()
      )
      const screenshotDir = writeFixtureScreenshot(artifactsDir)

      const result = verifyMergeReport({ artifactsDir })

      expect(result.ok).toBe(true)
      expect(result.passed).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.readableSteps).toBe(1)
      expect(result.screenshotDirs).toEqual([screenshotDir])
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })

  test('fails when the cucumber messages fixture is missing', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-verify-merge-missing-'))
    try {
      const result = verifyMergeReport({ artifactsDir })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Missing fixture:')
      expect(result.error).toContain('cucumber-messages-shard-1/messages.ndjson')
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })

  test('fails when scenarios lack PASSED/FAILED outcomes', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-verify-merge-status-'))
    try {
      writeNdjson(path.join(artifactsDir, 'cucumber-messages-shard-1', 'messages.ndjson'), [
        {
          pickle: {
            id: 'pickle-empty',
            uri: 'features/empty.feature',
            name: 'No finished attempt',
            tags: [{ name: '@EMPTY' }],
            steps: [{ id: 'pickle-step-1', text: 'noop' }]
          }
        },
        {
          testCase: {
            id: 'case-empty',
            pickleId: 'pickle-empty',
            testSteps: [{ id: 'case-step-1', pickleStepId: 'pickle-step-1' }]
          }
        }
      ])
      writeFixtureScreenshot(artifactsDir)

      const result = verifyMergeReport({ artifactsDir })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Expected at least one PASSED or FAILED scenario')
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })

  test('fails when gherkin step labels are opaque ids only', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-verify-merge-opaque-'))
    try {
      writeNdjson(path.join(artifactsDir, 'cucumber-messages-shard-1', 'messages.ndjson'), [
        {
          pickle: {
            id: 'pickle-opaque',
            uri: 'features/opaque.feature',
            name: 'Opaque steps',
            tags: [{ name: '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS' }],
            steps: [{ id: 'pickle-step-opaque' }]
          }
        },
        {
          testCase: {
            id: 'case-opaque',
            pickleId: 'pickle-opaque',
            testSteps: [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', pickleStepId: 'pickle-step-opaque' }]
          }
        },
        { testCaseStarted: { id: 'attempt-opaque', testCaseId: 'case-opaque' } },
        {
          testStepStarted: {
            testCaseStartedId: 'attempt-opaque',
            testStepId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
          }
        },
        {
          testStepFinished: {
            testCaseStartedId: 'attempt-opaque',
            testStepId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            testStepResult: { status: 'PASSED' }
          }
        },
        {
          testCaseFinished: {
            testCaseStartedId: 'attempt-opaque',
            testCaseResult: { status: 'PASSED' }
          }
        }
      ])
      writeFixtureScreenshot(artifactsDir)

      const result = verifyMergeReport({ artifactsDir })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Expected at least one Gherkin step label')
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })

  test('fails when the fixture screenshot shard directory is absent', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-verify-merge-shot-'))
    try {
      writeNdjson(
        path.join(artifactsDir, 'cucumber-messages-shard-1', 'messages.ndjson'),
        seoHeaderEnvelopes()
      )

      const result = verifyMergeReport({ artifactsDir })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Expected failure-screenshots-shard-fixture')
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })

  test('fails when the SEO header scenario cannot attach a screenshot data URL', () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-verify-merge-attach-'))
    try {
      writeNdjson(
        path.join(artifactsDir, 'cucumber-messages-shard-1', 'messages.ndjson'),
        seoHeaderEnvelopes()
      )
      const screenshotDir = path.join(artifactsDir, 'failure-screenshots-shard-fixture')
      fs.mkdirSync(screenshotDir, { recursive: true })
      fs.writeFileSync(
        path.join(screenshotDir, 'manifest.ndjson'),
        JSON.stringify({
          testId: 'other-failure',
          title: 'Unrelated failure',
          tag: '@OTHER_TAG'
        }) + '\n'
      )
      fs.writeFileSync(path.join(screenshotDir, 'other-failure.png'), Buffer.from('other-png'))

      const result = verifyMergeReport({ artifactsDir })
      expect(result.ok).toBe(false)
      expect(result.error).toContain(
        'Expected failure screenshot data URL on @PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS'
      )
    } finally {
      fs.rmSync(artifactsDir, { recursive: true, force: true })
    }
  })
})
