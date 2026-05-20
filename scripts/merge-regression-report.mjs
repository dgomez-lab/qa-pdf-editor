#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const artifactsDir = process.env.ARTIFACTS_DIR || path.join(root, 'artifacts')
const outputDir = process.env.REPORT_OUTPUT_DIR || path.join(root, 'report')
const runId = process.env.GITHUB_RUN_ID || 'local'
const repository = process.env.GITHUB_REPOSITORY || 'local/qa-pdf-editor'
const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
const refName = process.env.GITHUB_REF_NAME || 'local'
const actor = process.env.GITHUB_ACTOR || 'local'
const workflow = process.env.GITHUB_WORKFLOW || 'Playwright'
const mvpsSlot = process.env.PLAYWRIGHT_MVPS_SLOT || ''
const githubOutput = process.env.GITHUB_OUTPUT

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function findFiles(dir, name) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findFiles(p, name))
    else if (entry.name === name) out.push(p)
  }
  return out
}

function readNdjsonFiles(paths) {
  const lines = []
  for (const file of paths) {
    const content = fs.readFileSync(file, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim()
      if (t) lines.push(t)
    }
  }
  return lines.map((l) => JSON.parse(l))
}

function primaryTag(pickle) {
  const tags = pickle.tags || []
  const preferred = tags.find((t) => /^@(PDFEDITOR|PDFHINT)/i.test(t.name))
  return preferred?.name || tags[0]?.name || null
}

function parseCucumberMessages(envelopes) {
  const pickles = new Map()
  const testCases = new Map()
  const pickleStepText = new Map()
  const attempts = new Map()

  for (const env of envelopes) {
    if (env.pickle) {
      pickles.set(env.pickle.id, env.pickle)
      for (const step of env.pickle.steps || []) {
        pickleStepText.set(step.id, step.text)
      }
    }
    if (env.testCase) testCases.set(env.testCase.id, env.testCase)
    if (env.testCaseStarted) {
      const tc = testCases.get(env.testCaseStarted.testCaseId)
      const pickle = tc ? pickles.get(tc.pickleId) : null
      attempts.set(env.testCaseStarted.id, {
        testCaseStartedId: env.testCaseStarted.id,
        testCaseId: env.testCaseStarted.testCaseId,
        pickle,
        steps: [],
        status: 'UNKNOWN',
        durationNs: 0,
        errorMessage: '',
        screenshotDataUrl: null
      })
    }
    if (env.testStepStarted) {
      const att = attempts.get(env.testStepStarted.testCaseStartedId)
      if (att) {
        att.steps.push({
          id: env.testStepStarted.testStepId,
          text: pickleStepText.get(env.testStepStarted.testStepId) || env.testStepStarted.testStepId,
          status: 'UNKNOWN',
          durationNs: 0,
          errorMessage: '',
          screenshotDataUrl: null
        })
      }
    }
    if (env.testStepFinished) {
      const att = attempts.get(env.testStepFinished.testCaseStartedId)
      if (!att) continue
      const step = att.steps.find((s) => s.id === env.testStepFinished.testStepId)
      if (step && env.testStepFinished.testStepResult) {
        step.status = env.testStepFinished.testStepResult.status
        step.durationNs = env.testStepFinished.testStepResult.duration?.seconds
          ? Number(env.testStepFinished.testStepResult.duration.seconds) * 1e9 +
            Number(env.testStepFinished.testStepResult.duration.nanos || 0)
          : 0
        const msg = env.testStepFinished.testStepResult.message
        if (msg) step.errorMessage = msg
        if (env.testStepFinished.testStepResult.exception?.message) {
          step.errorMessage = env.testStepFinished.testStepResult.exception.message
        }
      }
    }
    if (env.attachment) {
      const a = env.attachment
      const media = a.mediaType || a.contentType || ''
      if (!media.startsWith('image/')) continue
      const body = a.body
      if (!body) continue
      const dataUrl = `data:${media};base64,${body}`
      const att = a.testCaseStartedId ? attempts.get(a.testCaseStartedId) : null
      if (a.testStepId && att) {
        const step = att.steps.find((s) => s.id === a.testStepId)
        if (step) step.screenshotDataUrl = dataUrl
      } else if (att) {
        att.screenshotDataUrl = dataUrl
      }
    }
    if (env.testCaseFinished) {
      const att = attempts.get(env.testCaseFinished.testCaseStartedId)
      if (att && env.testCaseFinished.testCaseResult) {
        att.status = env.testCaseFinished.testCaseResult.status
        att.durationNs = env.testCaseFinished.testCaseResult.duration?.seconds
          ? Number(env.testCaseFinished.testCaseResult.duration.seconds) * 1e9 +
            Number(env.testCaseFinished.testCaseResult.duration.nanos || 0)
          : 0
        if (env.testCaseFinished.testCaseResult.message) {
          att.errorMessage = env.testCaseFinished.testCaseResult.message
        }
      }
    }
  }

  const byTestCase = new Map()
  for (const att of attempts.values()) {
    byTestCase.set(att.testCaseId, att)
  }

  const scenarios = []
  for (const [testCaseId, att] of byTestCase) {
    const pickle = att.pickle
    if (!pickle) continue
    const tag = primaryTag(pickle)
    const failedStep = att.steps.find((s) => s.status === 'FAILED')
    scenarios.push({
      id: testCaseId,
      label: tag || pickle.name,
      featureName: pickle.uri || pickle.name,
      scenarioName: pickle.name,
      status: att.status,
      durationMs: Math.round(att.durationNs / 1e6),
      steps: att.steps,
      errorMessage: att.errorMessage || failedStep?.errorMessage || '',
      screenshotDataUrl: failedStep?.screenshotDataUrl || att.screenshotDataUrl
    })
  }

  scenarios.sort((a, b) => a.label.localeCompare(b.label))
  return scenarios
}

function countByStatus(scenarios) {
  const counts = { PASSED: 0, FAILED: 0, SKIPPED: 0, PENDING: 0, UNKNOWN: 0 }
  for (const s of scenarios) {
    const k = counts[s.status] !== undefined ? s.status : 'UNKNOWN'
    counts[k] = (counts[k] || 0) + 1
  }
  return counts
}

function statusClass(status) {
  if (status === 'PASSED') return 'passed'
  if (status === 'FAILED') return 'failed'
  if (status === 'SKIPPED') return 'skipped'
  return 'pending'
}

function buildHtml(scenarios, meta) {
  const counts = countByStatus(scenarios)
  const total = scenarios.length
  const done = counts.PASSED + counts.FAILED + counts.SKIPPED
  const pct = total ? Math.round((done / total) * 100) : 0
  const scenariosJson = JSON.stringify(scenarios).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Regression ${escapeHtml(meta.runId)} — PDFEditor</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --border: #2d3a4f;
      --text: #e6edf3;
      --muted: #8b9cb3;
      --passed: #3fb950;
      --failed: #d29922;
      --skipped: #58a6ff;
      --pending: #388bfd;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
    }
    header h1 { margin: 0 0 0.5rem; font-size: 1.25rem; }
    .meta { color: var(--muted); font-size: 0.875rem; line-height: 1.6; }
    .meta a { color: #58a6ff; }
    main { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
    .progress-wrap { margin-bottom: 1.5rem; }
    .progress-wrap h2 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 0 0 0.5rem; }
    .progress-bar {
      height: 12px;
      background: var(--panel);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--passed), var(--passed) ${pct}%, var(--border) ${pct}%);
      transition: width 0.3s;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.75rem;
      font-size: 0.9rem;
    }
    .stat { padding: 0.35rem 0.75rem; border-radius: 6px; background: var(--panel); border: 1px solid var(--border); }
    .stat.passed { border-color: var(--passed); color: var(--passed); }
    .stat.failed { border-color: var(--failed); color: var(--failed); }
    .stat.skipped { border-color: var(--skipped); color: var(--skipped); }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .cell {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      cursor: pointer;
      border: none;
      padding: 0;
    }
    .cell.passed { background: var(--passed); }
    .cell.failed { background: var(--failed); }
    .cell.skipped { background: var(--skipped); opacity: 0.7; }
    .cell.pending, .cell.unknown { background: var(--pending); opacity: 0.5; }
    .cell:hover { outline: 2px solid #fff; outline-offset: 1px; }
    .overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .overlay.open { display: flex; }
    .modal {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow: auto;
      padding: 1.25rem;
    }
    .modal h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .modal .tag { color: var(--failed); font-size: 0.85rem; margin-bottom: 0.75rem; }
    .modal .scenario { color: var(--muted); font-size: 0.875rem; margin-bottom: 1rem; }
    .steps { list-style: none; padding: 0; margin: 0 0 1rem; }
    .steps li {
      padding: 0.5rem 0.75rem;
      margin-bottom: 4px;
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: ui-monospace, monospace;
    }
    .steps li.passed { background: rgba(63, 185, 80, 0.15); border-left: 3px solid var(--passed); }
    .steps li.failed { background: rgba(210, 153, 34, 0.2); border-left: 3px solid var(--failed); }
    .steps li.skipped { background: rgba(88, 166, 255, 0.1); border-left: 3px solid var(--skipped); opacity: 0.7; }
    .steps li.unknown { border-left: 3px solid var(--muted); }
    .screenshot { max-width: 100%; border: 1px solid var(--border); border-radius: 4px; margin-top: 0.75rem; }
    .error { color: #f85149; font-size: 0.8rem; white-space: pre-wrap; margin-top: 0.5rem; }
    .close {
      float: right;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
    }
    footer.links { margin-top: 1.5rem; font-size: 0.875rem; }
    footer.links a { color: #58a6ff; margin-right: 1rem; }
  </style>
</head>
<body>
  <header>
    <h1>PDFEditor regression — run ${escapeHtml(meta.runId)}</h1>
    <div class="meta">
      <div>Workflow: ${escapeHtml(meta.workflow)} · Branch: <code>${escapeHtml(meta.refName)}</code> · By: ${escapeHtml(meta.actor)}</div>
      <div>Environment: red${meta.mvpsSlot ? ` / slot ${escapeHtml(meta.mvpsSlot)}` : ''}</div>
      <div><a href="${escapeHtml(meta.runUrl)}" target="_blank" rel="noopener">GitHub Actions run</a></div>
    </div>
  </header>
  <main>
    <section class="progress-wrap">
      <h2>Progress</h2>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="stats">
        <span class="stat">${pct}% complete</span>
        <span class="stat">${total} total</span>
        <span class="stat passed">${counts.PASSED} passed</span>
        <span class="stat failed">${counts.FAILED} failed</span>
        <span class="stat skipped">${counts.SKIPPED} skipped</span>
      </div>
    </section>
    <section>
      <h2 style="font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin:0 0 0.75rem;">Results</h2>
      <div class="grid" id="grid"></div>
    </section>
    <footer class="links">
      <a id="pw-report-link" href="playwright/index.html" style="display:none">Playwright HTML report (traces)</a>
    </footer>
  </main>
  <div class="overlay" id="overlay" role="dialog" aria-modal="true">
    <div class="modal">
      <button type="button" class="close" id="close-modal">Close</button>
      <h3 id="modal-title"></h3>
      <div class="tag" id="modal-tag"></div>
      <div class="scenario" id="modal-scenario"></div>
      <div class="error" id="modal-error"></div>
      <ul class="steps" id="modal-steps"></ul>
      <img class="screenshot" id="modal-screenshot" alt="Failure screenshot" hidden />
    </div>
  </div>
  <script>
    const scenarios = ${scenariosJson};
    const grid = document.getElementById('grid');
    const overlay = document.getElementById('overlay');
    scenarios.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell ' + (s.status === 'PASSED' ? 'passed' : s.status === 'FAILED' ? 'failed' : s.status === 'SKIPPED' ? 'skipped' : 'pending');
      btn.title = s.label + ' (' + s.status + ')';
      btn.addEventListener('click', () => openModal(s));
      grid.appendChild(btn);
    });
    function openModal(s) {
      document.getElementById('modal-title').textContent = s.label;
      document.getElementById('modal-tag').textContent = s.label.startsWith('@') ? s.label : '';
      document.getElementById('modal-scenario').textContent = s.scenarioName;
      document.getElementById('modal-error').textContent = s.errorMessage || '';
      const stepsEl = document.getElementById('modal-steps');
      stepsEl.innerHTML = '';
      for (const step of s.steps) {
        const li = document.createElement('li');
        li.className = (step.status === 'PASSED' ? 'passed' : step.status === 'FAILED' ? 'failed' : step.status === 'SKIPPED' ? 'skipped' : 'unknown');
        li.textContent = step.text;
        stepsEl.appendChild(li);
      }
      const img = document.getElementById('modal-screenshot');
      if (s.screenshotDataUrl) {
        img.src = s.screenshotDataUrl;
        img.hidden = false;
      } else {
        img.hidden = true;
        img.removeAttribute('src');
      }
      overlay.classList.add('open');
    }
    document.getElementById('close-modal').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
    if (${meta.hasPlaywrightReport ? 'true' : 'false'}) {
      document.getElementById('pw-report-link').style.display = 'inline';
    }
  </script>
</body>
</html>`
}

function mergePlaywrightBlobs(blobDirs, outReportDir) {
  let found = 0
  const blobs = []
  for (const dir of blobDirs) {
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.zip') || f.endsWith('.jsonl')) {
        blobs.push(path.join(dir, f))
        found++
      }
    }
  }
  if (found === 0) return false
  const mergeInput = path.join(outputDir, '_blob-merge-input')
  fs.mkdirSync(mergeInput, { recursive: true })
  try {
    blobs.forEach((src, i) => {
      fs.copyFileSync(src, path.join(mergeInput, `${i}-${path.basename(src)}`))
    })
    execSync(`npx playwright merge-reports --reporter html "${mergeInput}"`, {
      cwd: root,
      stdio: 'inherit'
    })
    const defaultReport = path.join(root, 'playwright-report')
    const target = path.join(outReportDir, 'playwright')
    if (fs.existsSync(defaultReport)) {
      fs.rmSync(target, { recursive: true, force: true })
      fs.cpSync(defaultReport, target, { recursive: true })
    }
    return fs.existsSync(path.join(target, 'index.html'))
  } catch {
    return false
  } finally {
    fs.rmSync(mergeInput, { recursive: true, force: true })
  }
}

function writeGithubOutput(key, value) {
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `${key}=${value}\n`)
  }
}

function main() {
  const ndjsonPaths = findFiles(artifactsDir, 'messages.ndjson')
  if (ndjsonPaths.length === 0) {
    console.warn('No cucumber messages.ndjson found under', artifactsDir)
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(
      path.join(outputDir, 'summary.md'),
      '## Regression report\n\nNo cucumber message artifacts were found. Shards may have timed out before producing reports.\n'
    )
    writeGithubOutput('report_ready', 'false')
    return
  }

  console.log('Merging', ndjsonPaths.length, 'message file(s)')
  const envelopes = readNdjsonFiles(ndjsonPaths)
  const scenarios = parseCucumberMessages(envelopes)
  const counts = countByStatus(scenarios)

  const [owner, repo] = repository.split('/')
  const pagesBase = `https://${owner}.github.io/${repo}`
  const pagesUrl = `${pagesBase}/runs/${runId}/`
  const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`

  const blobDirs = []
  if (fs.existsSync(artifactsDir)) {
    for (const entry of fs.readdirSync(artifactsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('blob-report-')) {
        blobDirs.push(path.join(artifactsDir, entry.name))
      }
    }
  }

  fs.mkdirSync(outputDir, { recursive: true })
  const hasPlaywrightReport = mergePlaywrightBlobs(blobDirs, outputDir)

  const html = buildHtml(scenarios, {
    runId,
    workflow,
    refName,
    actor,
    mvpsSlot,
    runUrl,
    hasPlaywrightReport
  })
  fs.writeFileSync(path.join(outputDir, 'index.html'), html)

  const total = scenarios.length
  const summary = `## Regression report

| Metric | Count |
|--------|------:|
| Total | ${total} |
| Passed | ${counts.PASSED} |
| Failed | ${counts.FAILED} |
| Skipped | ${counts.SKIPPED} |

**Progress:** ${total ? Math.round(((counts.PASSED + counts.FAILED + counts.SKIPPED) / total) * 100) : 0}%

**Dashboard:** [Open QAI-style report](${pagesUrl})

**Actions run:** [${runUrl}](${runUrl})
`
  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary)

  console.log('Report written to', outputDir)
  console.log('Pages URL:', pagesUrl)
  writeGithubOutput('report_ready', 'true')
  writeGithubOutput('pages_url', pagesUrl)
}

main()
