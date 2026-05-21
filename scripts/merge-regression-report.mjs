#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const blobsOnly = args.includes('--blobs-only')

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
const skipBlobMerge = process.env.SKIP_BLOB_MERGE === '1'
const blobMergeMaxBytes = Number(process.env.BLOB_MERGE_MAX_BYTES || '524288000')
const minNdjsonBytes = 1024
const expectedTestTotal = Number(process.env.REGRESSION_EXPECTED_TESTS || '214')
const expectedSources = Number(process.env.REGRESSION_EXPECTED_SOURCES || '12')

function isHookStepId(stepId) {
  return /-(before|after)-test-(case|run)-/.test(stepId)
}

function gherkinSteps(steps) {
  return steps.filter((s) => !isHookStepId(s.id))
}

function resolveAttemptStatus(att) {
  if (att.status !== 'UNKNOWN') return att.status
  const gherkin = gherkinSteps(att.steps)
  if (gherkin.some((s) => s.status === 'FAILED')) return 'FAILED'
  if (gherkin.some((s) => s.status === 'SKIPPED')) return 'SKIPPED'
  if (att.finished && gherkin.length > 0 && gherkin.every((s) => s.status === 'PASSED')) return 'PASSED'
  if (!att.finished) return 'INCOMPLETE'
  return 'UNKNOWN'
}

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

function sanitizeEnvelope(env) {
  if (!env?.attachment) return env
  const { body, ...rest } = env.attachment
  return { ...env, attachment: { ...rest, body: body ? '[stripped]' : undefined } }
}

async function streamNdjsonFile(filePath, onEnvelope) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  })
  let lineNo = 0
  for await (const line of rl) {
    lineNo++
    const t = line.trim()
    if (!t) continue
    if (t.length > 50_000_000) {
      console.warn(`Skipping oversized line ${lineNo} in ${filePath} (${t.length} chars)`)
      continue
    }
    try {
      onEnvelope(sanitizeEnvelope(JSON.parse(t)))
    } catch (err) {
      console.warn(`Invalid JSON at ${filePath}:${lineNo}:`, err.message)
    }
  }
}

async function loadEnvelopesFromPaths(paths) {
  const envelopes = []
  const sources = []
  for (const file of paths) {
    const stat = fs.statSync(file)
    const label = path.basename(path.dirname(file))
    if (stat.size < minNdjsonBytes) {
      console.warn(`Skipping ${file} (${stat.size} bytes — likely timeout stub)`)
      continue
    }
    console.log(`Reading ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`)
    let count = 0
    await streamNdjsonFile(file, (env) => {
      envelopes.push(env)
      count++
    })
    if (count > 0) sources.push({ label, count })
  }
  return { envelopes, sources }
}

function primaryTag(pickle) {
  const tags = pickle.tags || []
  const preferred = tags.find((t) => /^@(PDFEDITOR|PDFHINT)/i.test(t.name))
  return preferred?.name || tags[0]?.name || null
}

function normalizeScenarioTitle(title) {
  return String(title || '')
    .replace(/\s*\(pdfhint smoke\)\s*/gi, '')
    .trim()
    .toLowerCase()
}

function normalizePlaywrightTitle(title) {
  const raw = String(title || '').trim()
  if (!raw) return ''
  const parts = raw.split('›').map((p) => p.trim())
  const last = parts.length > 1 ? parts[parts.length - 1] : raw
  return normalizeScenarioTitle(last.replace(/^\[[^\]]+\]\s*/, ''))
}

function safeFileId(testId) {
  return String(testId || '').replace(/[^a-zA-Z0-9_-]/g, '_')
}

function findFailureScreenshotDirs(root) {
  const dirs = []
  if (!fs.existsSync(root)) return dirs
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(p, 'manifest.ndjson')
      if (fs.existsSync(manifestPath)) {
        dirs.push(p)
        continue
      }
      walk(p)
    }
  }
  walk(root)
  return dirs
}

function loadFailureScreenshotIndex(artifactsDir) {
  const byTag = new Map()
  const byTitle = new Map()
  for (const dir of findFailureScreenshotDirs(artifactsDir)) {
    const manifestPath = path.join(dir, 'manifest.ndjson')
    if (!fs.existsSync(manifestPath)) continue
    for (const line of fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue
      let entry
      try {
        entry = JSON.parse(line)
      } catch {
        continue
      }
      const pngPath = path.join(dir, `${safeFileId(entry.testId)}.png`)
      if (!fs.existsSync(pngPath)) continue
      const buf = fs.readFileSync(pngPath)
      const dataUrl = `data:image/png;base64,${buf.toString('base64')}`
      if (entry.tag) byTag.set(entry.tag, dataUrl)
      if (entry.title) {
        byTitle.set(normalizeScenarioTitle(entry.title), dataUrl)
        const fromPw = normalizePlaywrightTitle(entry.title)
        if (fromPw) byTitle.set(fromPw, dataUrl)
      }
    }
  }
  return { byTag, byTitle }
}

function applyFailureScreenshots(scenarios, artifactsDir) {
  const { byTag, byTitle } = loadFailureScreenshotIndex(artifactsDir)
  for (const s of scenarios) {
    if (s.status !== 'FAILED' && !s.steps.some((st) => st.status === 'FAILED')) continue
    const dataUrl =
      (s.label && byTag.get(s.label)) || byTitle.get(normalizeScenarioTitle(s.scenarioName)) || null
    if (!dataUrl) continue
    if (!s.screenshotDataUrl) s.screenshotDataUrl = dataUrl
    const failedStep = s.steps.find((st) => st.status === 'FAILED' && !isHookStepId(st.id))
    if (failedStep && !failedStep.screenshotDataUrl) failedStep.screenshotDataUrl = dataUrl
  }
}

function buildTestStepTextMap(testCases, pickleStepText) {
  const testStepText = new Map()
  for (const tc of testCases.values()) {
    for (const ts of tc.testSteps || []) {
      if (!ts.pickleStepId) continue
      const text = pickleStepText.get(ts.pickleStepId)
      if (text) testStepText.set(ts.id, text)
    }
  }
  return testStepText
}

function resolveStepText(testStepId, testStepText, pickleStepText) {
  return (
    testStepText.get(testStepId) ||
    pickleStepText.get(testStepId) ||
    testStepId
  )
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
  }

  const testStepText = buildTestStepTextMap(testCases, pickleStepText)

  for (const env of envelopes) {
    if (env.testCaseStarted) {
      const tc = testCases.get(env.testCaseStarted.testCaseId)
      const pickle = tc ? pickles.get(tc.pickleId) : null
      attempts.set(env.testCaseStarted.id, {
        testCaseStartedId: env.testCaseStarted.id,
        testCaseId: env.testCaseStarted.testCaseId,
        pickle,
        steps: [],
        status: 'UNKNOWN',
        finished: false,
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
          text: resolveStepText(env.testStepStarted.testStepId, testStepText, pickleStepText),
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
      if (a.body === '[stripped]' || !a.body) continue
      const media = a.mediaType || a.contentType || ''
      if (!media.startsWith('image/')) continue
      const dataUrl = `data:${media};base64,${a.body}`
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
      if (att) {
        att.finished = true
        if (env.testCaseFinished.testCaseResult) {
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
  }

  const byTestCase = new Map()
  for (const att of attempts.values()) {
    byTestCase.set(att.testCaseId, att)
  }

  const scenarios = []
  for (const [, att] of byTestCase) {
    const pickle = att.pickle
    if (!pickle) continue
    const tag = primaryTag(pickle)
    const status = resolveAttemptStatus(att)
    const failedStep = att.steps.find((s) => s.status === 'FAILED')
    scenarios.push({
      id: att.testCaseId,
      label: tag || pickle.name,
      featureName: pickle.uri || pickle.name,
      scenarioName: pickle.name,
      status,
      durationMs: Math.round(att.durationNs / 1e6),
      steps: att.steps,
      errorMessage: att.errorMessage || failedStep?.errorMessage || '',
      screenshotDataUrl: failedStep?.screenshotDataUrl || att.screenshotDataUrl
    })
  }

  scenarios.sort((a, b) => a.label.localeCompare(b.label))
  return scenarios
}

export {
  parseCucumberMessages,
  resolveAttemptStatus,
  isHookStepId,
  gherkinSteps,
  applyFailureScreenshots,
  findFailureScreenshotDirs
}

function countByStatus(scenarios) {
  const counts = { PASSED: 0, FAILED: 0, SKIPPED: 0, PENDING: 0, INCOMPLETE: 0, UNKNOWN: 0 }
  for (const s of scenarios) {
    const k = counts[s.status] !== undefined ? s.status : 'UNKNOWN'
    counts[k] = (counts[k] || 0) + 1
  }
  return counts
}

function buildHtml(scenarios, meta) {
  const counts = countByStatus(scenarios)
  const total = scenarios.length
  const done = counts.PASSED + counts.FAILED + counts.SKIPPED
  const pct = total ? Math.round((done / total) * 100) : 0
  const scenariosJson = JSON.stringify(scenarios).replace(/</g, '\\u003c')
  const incompleteStat =
    counts.INCOMPLETE > 0
      ? `<span class="stat incomplete">${counts.INCOMPLETE} incomplete</span>`
      : ''
  const partialBanner = meta.partialRun
    ? `<div class="banner">Partial run: ${meta.sourcesUsed}/${expectedSources} shard artifacts had test data (${total} reported, ${expectedTestTotal} expected). Timed-out or cancelled jobs may be missing.</div>`
    : ''

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
      --warn: #d29922;
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
    .banner {
      margin: 1rem 1.5rem 0;
      padding: 0.75rem 1rem;
      background: rgba(210, 153, 34, 0.15);
      border: 1px solid var(--warn);
      border-radius: 6px;
      color: var(--warn);
      font-size: 0.875rem;
    }
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
    .stat.incomplete { border-color: var(--warn); color: var(--warn); }
    .grid { display: flex; flex-wrap: wrap; gap: 4px; }
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
    .cell.incomplete { background: var(--warn); opacity: 0.85; }
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
  ${partialBanner}
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
        ${incompleteStat}
      </div>
    </section>
    <section>
      <h2 style="font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin:0 0 0.75rem;">Results</h2>
      <div class="grid" id="grid"></div>
    </section>
    <footer class="links">
      <a id="pw-report-link" href="playwright/index.html" style="display:none">Playwright HTML report (traces)</a>
      <span id="pw-report-missing" style="color:var(--muted);display:none">Screenshots/traces: open shard logs or re-run with smaller blob artifacts.</span>
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
    scenarios.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell ' + (s.status === 'PASSED' ? 'passed' : s.status === 'FAILED' ? 'failed' : s.status === 'SKIPPED' ? 'skipped' : s.status === 'INCOMPLETE' ? 'incomplete' : 'pending');
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
      const gherkin = (s.steps || []).filter((step) => !/-(before|after)-test-(case|run)-/.test(step.id));
      for (const step of gherkin) {
        const li = document.createElement('li');
        li.className = (step.status === 'PASSED' ? 'passed' : step.status === 'FAILED' ? 'failed' : step.status === 'SKIPPED' ? 'skipped' : 'unknown');
        li.textContent = step.text;
        if (step.errorMessage) {
          const err = document.createElement('div');
          err.className = 'error';
          err.textContent = step.errorMessage;
          li.appendChild(err);
        }
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
    } else {
      document.getElementById('pw-report-missing').style.display = 'inline';
    }
  </script>
</body>
</html>`
}

function collectBlobDirs() {
  const blobDirs = []
  if (!fs.existsSync(artifactsDir)) return blobDirs
  for (const entry of fs.readdirSync(artifactsDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('blob-report-')) {
      blobDirs.push(path.join(artifactsDir, entry.name))
    }
  }
  return blobDirs
}

function totalBlobBytes(blobDirs) {
  let total = 0
  for (const dir of blobDirs) {
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.zip') || f.endsWith('.jsonl')) {
        total += fs.statSync(path.join(dir, f)).size
      }
    }
  }
  return total
}

function mergePlaywrightBlobs(blobDirs, outReportDir) {
  const blobs = []
  for (const dir of blobDirs) {
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.zip') || f.endsWith('.jsonl')) {
        blobs.push(path.join(dir, f))
      }
    }
  }
  if (blobs.length === 0) {
    console.log('No blob files to merge')
    return false
  }
  const total = blobs.reduce((n, p) => n + fs.statSync(p).size, 0)
  if (total > blobMergeMaxBytes) {
    console.warn(
      `Skipping blob merge: ${(total / 1024 / 1024).toFixed(0)} MB exceeds cap ${(blobMergeMaxBytes / 1024 / 1024).toFixed(0)} MB`
    )
    return false
  }
  const mergeInput = path.join(outputDir, '_blob-merge-input')
  fs.mkdirSync(mergeInput, { recursive: true })
  try {
    blobs.forEach((src, i) => {
      fs.copyFileSync(src, path.join(mergeInput, `${i}-${path.basename(src)}`))
    })
    console.log(`Merging ${blobs.length} blob file(s)...`)
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
  } catch (err) {
    console.warn('Blob merge failed:', err.message || err)
    return false
  } finally {
    fs.rmSync(mergeInput, { recursive: true, force: true })
  }
}

function patchDashboardPlaywrightLink(hasPlaywrightReport) {
  const indexPath = path.join(outputDir, 'index.html')
  if (!fs.existsSync(indexPath)) return
  let html = fs.readFileSync(indexPath, 'utf8')
  if (hasPlaywrightReport) {
    html = html.replace(
      'id="pw-report-link" href="playwright/index.html" style="display:none"',
      'id="pw-report-link" href="playwright/index.html" style="display:inline"'
    )
    html = html.replace('id="pw-report-missing" style="color:var(--muted);display:none"', 'id="pw-report-missing" style="display:none"')
  }
  fs.writeFileSync(indexPath, html)
}

function writeGithubOutput(key, value) {
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `${key}=${value}\n`)
  }
}

async function runBlobsOnly() {
  fs.mkdirSync(outputDir, { recursive: true })
  const blobDirs = collectBlobDirs()
  const ok = mergePlaywrightBlobs(blobDirs, outputDir)
  patchDashboardPlaywrightLink(ok)
  process.exit(0)
}

async function main() {
  if (blobsOnly) {
    await runBlobsOnly()
    return
  }

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

  const { envelopes, sources } = await loadEnvelopesFromPaths(ndjsonPaths)
  if (envelopes.length === 0) {
    console.warn('No valid cucumber envelopes after parsing')
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(
      path.join(outputDir, 'summary.md'),
      '## Regression report\n\nCucumber message files were present but empty or invalid (timed-out shards).\n'
    )
    writeGithubOutput('report_ready', 'false')
    return
  }

  const scenarios = parseCucumberMessages(envelopes)
  applyFailureScreenshots(scenarios, artifactsDir)
  const counts = countByStatus(scenarios)
  const sourcesUsed = sources.length
  const partialRun = sourcesUsed < expectedSources

  const [owner, repo] = repository.split('/')
  const pagesBase = `https://${owner}.github.io/${repo}`
  const pagesUrl = `${pagesBase}/runs/${runId}/`
  const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`

  fs.mkdirSync(outputDir, { recursive: true })

  let hasPlaywrightReport = false
  if (!skipBlobMerge) {
    const blobDirs = collectBlobDirs()
    const total = totalBlobBytes(blobDirs)
    if (total <= blobMergeMaxBytes) {
      hasPlaywrightReport = mergePlaywrightBlobs(blobDirs, outputDir)
    } else {
      console.warn(`Skipping inline blob merge (${(total / 1024 / 1024).toFixed(0)} MB); workflow may run --blobs-only`)
    }
  }

  const html = buildHtml(scenarios, {
    runId,
    workflow,
    refName,
    actor,
    mvpsSlot,
    runUrl,
    hasPlaywrightReport,
    partialRun,
    sourcesUsed
  })
  fs.writeFileSync(path.join(outputDir, 'index.html'), html)

  const total = scenarios.length
  const partialNote = partialRun
    ? `\n\n> **Partial run:** ${sourcesUsed}/${expectedSources} shards contributed data (${total}/${expectedTestTotal} tests). Open shard job logs for timed-out jobs.\n`
    : ''
  const incompleteRow =
    counts.INCOMPLETE > 0 ? `| Incomplete | ${counts.INCOMPLETE} |\n` : ''
  const summary = `## Regression report

| Metric | Count |
|--------|------:|
| Total | ${total}${partialRun ? ` (expected ${expectedTestTotal})` : ''} |
| Passed | ${counts.PASSED} |
| Failed | ${counts.FAILED} |
| Skipped | ${counts.SKIPPED} |
${incompleteRow}
**Progress:** ${total ? Math.round(((counts.PASSED + counts.FAILED + counts.SKIPPED) / total) * 100) : 0}%

**Dashboard:** [Open QAI-style report](${pagesUrl})

**Actions run:** [${runUrl}](${runUrl})

Per-shard traces: download \`blob-report-*\` artifacts if Playwright HTML merge was skipped.${partialNote}
`
  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary)

  console.log('Report written to', outputDir)
  console.log('Pages URL:', pagesUrl)
  writeGithubOutput('report_ready', 'true')
  writeGithubOutput('pages_url', pagesUrl)
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isMain) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
