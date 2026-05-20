#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const resultsPath = path.join(root, 'playwright-report', 'results.json')
const summaryPath = process.env.GITHUB_STEP_SUMMARY

function walkSuites(suites, filePrefix, out) {
  if (!suites) return
  for (const suite of suites) {
    const prefix = filePrefix ? `${filePrefix} › ${suite.title}` : suite.title
    for (const spec of suite.specs || []) {
      const specTitle = prefix ? `${prefix} › ${spec.title}` : spec.title
      for (const test of spec.tests || []) {
        for (const result of test.results || []) {
          if (result.status === 'failed' || result.status === 'timedOut') {
            const msg =
              result.error?.message ||
              result.error?.stack ||
              (result.errors && result.errors[0]?.message) ||
              '(no error message)'
            out.push({ title: specTitle, status: result.status, message: String(msg).trim() })
          }
        }
      }
    }
    walkSuites(suite.suites, prefix, out)
  }
}

function buildMarkdown(failures) {
  if (failures.length === 0) {
    return '## CI fast — failures\n\nNo failed tests found in `playwright-report/results.json` (check job logs or artifacts).\n'
  }
  const lines = ['## CI fast — failed tests', '']
  for (const f of failures) {
    lines.push(`### ${f.title}`)
    lines.push('')
    lines.push(`**Status:** ${f.status}`)
    lines.push('')
    lines.push('```')
    lines.push(f.message.slice(0, 4000))
    lines.push('```')
    lines.push('')
  }
  return lines.join('\n')
}

function main() {
  if (!fs.existsSync(resultsPath)) {
    const text = '## CI fast — failures\n\n`playwright-report/results.json` not found.\n'
    if (summaryPath) fs.appendFileSync(summaryPath, text)
    else console.log(text)
    return
  }

  const report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
  const failures = []
  walkSuites(report.suites, '', failures)

  const md = buildMarkdown(failures)
  if (summaryPath) fs.appendFileSync(summaryPath, md)
  else console.log(md)
}

main()
