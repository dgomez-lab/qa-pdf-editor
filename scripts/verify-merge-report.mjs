#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseCucumberMessages,
  applyFailureScreenshots,
  findFailureScreenshotDirs
} from './merge-regression-report.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export function verifyMergeReport(options = {}) {
  const artifactsDir = options.artifactsDir ?? path.join(root, 'artifacts')
  const fixture = path.join(artifactsDir, 'cucumber-messages-shard-1/messages.ndjson')

  if (!fs.existsSync(fixture)) {
    return { ok: false, error: `Missing fixture: ${fixture}` }
  }

  const lines = fs.readFileSync(fixture, 'utf8').trim().split(/\r?\n/)
  const envelopes = lines.map((line) => JSON.parse(line))
  const scenarios = parseCucumberMessages(envelopes)
  const passed = scenarios.filter((s) => s.status === 'PASSED').length
  const failed = scenarios.filter((s) => s.status === 'FAILED').length

  if (passed === 0 && failed === 0) {
    return { ok: false, error: 'Expected at least one PASSED or FAILED scenario from fixture' }
  }

  const gherkinSteps = scenarios.flatMap((s) =>
    (s.steps || []).filter((st) => /-(before|after)-test-(case|run)-/.test(st.id) === false)
  )
  const readable = gherkinSteps.filter(
    (st) => st.text && !/-step-\d+$/.test(st.text) && !/^[0-9a-f]{8,}-/.test(st.text)
  )
  if (readable.length === 0) {
    return { ok: false, error: 'Expected at least one Gherkin step label (not opaque step id)' }
  }

  const screenshotDirs = findFailureScreenshotDirs(artifactsDir)
  const fixtureScreenshotDir = path.join(artifactsDir, 'failure-screenshots-shard-fixture')
  if (!screenshotDirs.includes(fixtureScreenshotDir)) {
    return {
      ok: false,
      error: `Expected failure-screenshots-shard-fixture in screenshot index: ${JSON.stringify(screenshotDirs)}`
    }
  }

  const withFailed = scenarios.map((s) => ({ ...s, status: 'FAILED' }))
  applyFailureScreenshots(withFailed, artifactsDir)
  const header = withFailed.find((s) => s.label === '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS')
  if (!header?.screenshotDataUrl?.startsWith('data:image/png;base64,')) {
    return {
      ok: false,
      error: 'Expected failure screenshot data URL on @PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS'
    }
  }

  return {
    ok: true,
    scenarios: scenarios.length,
    passed,
    failed,
    readableSteps: readable.length,
    screenshotDirs
  }
}

function main() {
  const result = verifyMergeReport()
  if (!result.ok) {
    console.error(result.error)
    process.exit(1)
  }
  console.log(
    `OK: ${result.scenarios} scenarios, ${result.passed} passed, ${result.failed} failed, ${result.readableSteps} readable steps, screenshot index OK`
  )
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  main()
}
