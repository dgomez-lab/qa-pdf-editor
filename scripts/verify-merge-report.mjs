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
const artifactsDir = path.join(root, 'artifacts')
const fixture = path.join(artifactsDir, 'cucumber-messages-shard-1/messages.ndjson')

if (!fs.existsSync(fixture)) {
  console.error('Missing fixture:', fixture)
  process.exit(1)
}

const lines = fs.readFileSync(fixture, 'utf8').trim().split(/\r?\n/)
const envelopes = lines.map((line) => JSON.parse(line))
const scenarios = parseCucumberMessages(envelopes)
const passed = scenarios.filter((s) => s.status === 'PASSED').length
const failed = scenarios.filter((s) => s.status === 'FAILED').length

if (passed === 0 && failed === 0) {
  console.error('Expected at least one PASSED or FAILED scenario from fixture')
  process.exit(1)
}

const gherkinSteps = scenarios.flatMap((s) =>
  (s.steps || []).filter((st) => /-(before|after)-test-(case|run)-/.test(st.id) === false)
)
const readable = gherkinSteps.filter(
  (st) => st.text && !/-step-\d+$/.test(st.text) && !/^[0-9a-f]{8,}-/.test(st.text)
)
if (readable.length === 0) {
  console.error('Expected at least one Gherkin step label (not opaque step id)')
  process.exit(1)
}

const screenshotDirs = findFailureScreenshotDirs(artifactsDir)
const fixtureScreenshotDir = path.join(artifactsDir, 'failure-screenshots-shard-fixture')
if (!screenshotDirs.includes(fixtureScreenshotDir)) {
  console.error('Expected failure-screenshots-shard-fixture in screenshot index:', screenshotDirs)
  process.exit(1)
}

const withFailed = scenarios.map((s) => ({ ...s, status: 'FAILED' }))
applyFailureScreenshots(withFailed, artifactsDir)
const header = withFailed.find((s) => s.label === '@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS')
if (!header?.screenshotDataUrl?.startsWith('data:image/png;base64,')) {
  console.error('Expected failure screenshot data URL on @PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS')
  process.exit(1)
}

console.log(
  `OK: ${scenarios.length} scenarios, ${passed} passed, ${failed} failed, ${readable.length} readable steps, screenshot index OK`
)
