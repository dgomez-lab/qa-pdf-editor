#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCucumberMessages } from './merge-regression-report.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const fixture = path.join(root, 'artifacts/cucumber-messages-shard-1/messages.ndjson')

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

console.log(`OK: ${scenarios.length} scenarios, ${passed} passed, ${failed} failed`)
