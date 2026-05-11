#!/usr/bin/env node
/**
 * Comparador de tags `@PDFEDITOR_*` entre el repo legacy (Cucumber) y el actual (Playwright).
 *
 * Uso:
 *   npm run porting:tags
 *   LEGACY_REPO=/ruta/a/qai-pa-pdf-editor node scripts/porting-tags.mjs
 *
 * Salida:
 *   { legacyTotal, playwrightTotal, missingFromPlaywright[], extraInPlaywright[] }
 *
 * Exit code:
 *   0 si `missingFromPlaywright` está vacío.
 *   1 si quedan tags legacy sin spec en Playwright.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function resolveLegacyRoot() {
  const env = process.env.LEGACY_REPO?.trim()
  if (env) return path.resolve(env)
  return path.resolve(repoRoot, '..', 'qai-pa-pdf-editor')
}

function walkFiles(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walkFiles(p, pred, acc)
    else if (name.isFile() && pred(p)) acc.push(p)
  }
  return acc
}

function extractTags(content) {
  const out = new Set()
  const re = /@PDFEDITOR_[A-Z0-9_]+/g
  let m
  while ((m = re.exec(content)) !== null) out.add(m[0])
  return out
}

function collectLegacyTags(legacyRoot) {
  const featuresDir = path.join(legacyRoot, 'features')
  const files = walkFiles(featuresDir, (p) => p.endsWith('.feature'))
  const tags = new Set()
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8')
    for (const t of extractTags(c)) tags.add(t)
  }
  return tags
}

function collectPlaywrightTags(repoRoot) {
  const testsDir = path.join(repoRoot, 'tests')
  const files = walkFiles(testsDir, (p) => /\.spec\.ts$/.test(p))
  const tags = new Set()
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8')
    for (const t of extractTags(c)) tags.add(t)
  }
  return tags
}

function main() {
  const legacyRoot = resolveLegacyRoot()
  const featuresDir = path.join(legacyRoot, 'features')
  if (!fs.existsSync(featuresDir)) {
    console.error(JSON.stringify({ error: 'features_dir_missing', legacyRoot, featuresDir }, null, 2))
    process.exitCode = 1
    return
  }

  const legacy = collectLegacyTags(legacyRoot)
  const ours = collectPlaywrightTags(repoRoot)

  const missing = [...legacy].filter((t) => !ours.has(t)).sort()
  const extra = [...ours].filter((t) => !legacy.has(t)).sort()

  const payload = {
    legacyRoot,
    generatedAt: new Date().toISOString(),
    legacyTotal: legacy.size,
    playwrightTotal: ours.size,
    missingFromPlaywright: missing,
    extraInPlaywright: extra,
    parityRatio: legacy.size === 0 ? 0 : 1 - missing.length / legacy.size
  }
  console.log(JSON.stringify(payload, null, 2))
  process.exitCode = missing.length === 0 ? 0 : 1
}

main()
