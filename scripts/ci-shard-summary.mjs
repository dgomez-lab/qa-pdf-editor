#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const resultsPath = path.join(root, 'playwright-report', 'results.json')
const cucumberPath = path.join(root, 'cucumber-report', 'messages.ndjson')
const summaryPath = process.env.GITHUB_STEP_SUMMARY
const shardLabel = process.env.SHARD_LABEL || 'Regression shard'

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

function isHookStepId(stepId) {
  return /-(before|after)-test-(case|run)-/.test(stepId)
}

async function parseCucumberFailures(filePath) {
  const pickles = new Map()
  const pickleStepText = new Map()
  const testStepPickleStep = new Map()
  const testCases = new Map()
  const attempts = new Map()

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  })

  for await (const line of rl) {
    if (!line.trim()) continue
    let env
    try {
      env = JSON.parse(line)
    } catch {
      continue
    }
    if (env.pickle) {
      pickles.set(env.pickle.id, env.pickle)
      for (const step of env.pickle.steps || []) {
        pickleStepText.set(step.id, step.text)
      }
    }
    if (env.testCase) {
      testCases.set(env.testCase.id, env.testCase.pickleId)
      for (const step of env.testCase.testSteps || []) {
        if (step.pickleStepId) testStepPickleStep.set(step.id, step.pickleStepId)
      }
    }
    if (env.testCaseStarted) {
      attempts.set(env.testCaseStarted.id, {
        testCaseId: env.testCaseStarted.testCaseId,
        steps: [],
        status: 'UNKNOWN'
      })
    }
    if (env.testStepStarted) {
      const att = attempts.get(env.testStepStarted.testCaseStartedId)
      if (att) {
        const pickleStepId = testStepPickleStep.get(env.testStepStarted.testStepId)
        att.steps.push({
          id: env.testStepStarted.testStepId,
          text:
            (pickleStepId && pickleStepText.get(pickleStepId)) ||
            pickleStepText.get(env.testStepStarted.testStepId) ||
            env.testStepStarted.testStepId,
          status: 'UNKNOWN',
          errorMessage: ''
        })
      }
    }
    if (env.testStepFinished) {
      const att = attempts.get(env.testStepFinished.testCaseStartedId)
      if (!att) continue
      const step = att.steps.find((s) => s.id === env.testStepFinished.testStepId)
      if (step && env.testStepFinished.testStepResult) {
        step.status = env.testStepFinished.testStepResult.status
        const msg = env.testStepFinished.testStepResult.message
        if (msg) step.errorMessage = msg
        if (env.testStepFinished.testStepResult.exception?.message) {
          step.errorMessage = env.testStepFinished.testStepResult.exception.message
        }
      }
    }
    if (env.testCaseFinished) {
      const att = attempts.get(env.testCaseFinished.testCaseStartedId)
      if (att && env.testCaseFinished.testCaseResult) {
        att.status = env.testCaseFinished.testCaseResult.status
      }
    }
  }

  const failures = []
  for (const [, att] of attempts) {
    if (att.status !== 'FAILED') continue
    const pickleId = testCases.get(att.testCaseId)
    const pickle = pickleId ? pickles.get(pickleId) : null
    const tags = pickle?.tags || []
    const tag = tags.find((t) => /^@(PDFEDITOR|PDFHINT)/i.test(t.name))?.name || tags[0]?.name || ''
    const gherkinSteps = att.steps.filter((s) => !isHookStepId(s.id))
    const failedStep = gherkinSteps.find((s) => s.status === 'FAILED')
    failures.push({
      tag,
      scenarioName: pickle?.name || att.testCaseId,
      failedStep: failedStep?.text || '(unknown step)',
      errorMessage: failedStep?.errorMessage || '',
      steps: gherkinSteps.map((s) => ({ text: s.text, status: s.status, error: s.errorMessage }))
    })
  }
  return failures
}

function buildMarkdown(playwrightFailures, cucumberFailures) {
  const lines = [`## ${shardLabel} — failed tests`, '']
  if (cucumberFailures.length === 0 && playwrightFailures.length === 0) {
    lines.push('No failed tests found in reports (check job log).')
    lines.push('')
    return lines.join('\n')
  }
  if (cucumberFailures.length > 0) {
    lines.push('### Gherkin steps', '')
    for (const f of cucumberFailures) {
      lines.push(`- **${f.tag || f.scenarioName}** — \`${f.failedStep}\``)
      if (f.steps?.length) {
        lines.push('')
        lines.push('| Step | Status |')
        lines.push('|------|--------|')
        for (const s of f.steps) {
          lines.push(`| ${s.text.replace(/\|/g, '\\|')} | ${s.status} |`)
        }
      }
      if (f.errorMessage) {
        lines.push('')
        lines.push('```')
        lines.push(f.errorMessage.slice(0, 2000))
        lines.push('```')
      }
      lines.push('')
    }
  }
  if (playwrightFailures.length > 0) {
    lines.push('### Playwright report', '')
    for (const f of playwrightFailures) {
      lines.push(`#### ${f.title}`)
      lines.push('')
      lines.push('```')
      lines.push(f.message.slice(0, 4000))
      lines.push('```')
      lines.push('')
    }
  }
  lines.push('Artifacts: failure screenshots, `test-results/` traces, `cucumber-report/messages.ndjson`.')
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const playwrightFailures = []
  if (fs.existsSync(resultsPath)) {
    const report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
    walkSuites(report.suites, '', playwrightFailures)
  }

  let cucumberFailures = []
  if (fs.existsSync(cucumberPath)) {
    cucumberFailures = await parseCucumberFailures(cucumberPath)
  }

  const md = buildMarkdown(playwrightFailures, cucumberFailures)
  console.log(md)
  if (summaryPath) fs.appendFileSync(summaryPath, md)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
