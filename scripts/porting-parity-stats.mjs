#!/usr/bin/env node
/**
 * Estadísticas reproducibles de paridad qai-pa-pdf-editor → qa-pdf-editor.
 *
 * Uso:
 *   npm run porting:stats
 *   LEGACY_REPO=/ruta/a/qai-pa-pdf-editor node scripts/porting-parity-stats.mjs
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

function walkFeatures(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walkFeatures(p, acc)
    else if (name.isFile() && name.name.endsWith('.feature')) acc.push(p)
  }
  return acc
}

function countScenarioLines(content) {
  const re = /^\s*(Scenario|Scenario Outline)\s*:/gim
  const m = content.match(re)
  return m?.length ?? 0
}

function countPdfeditorTags(content) {
  const m = content.match(/@PDFEDITOR_[A-Z0-9_]+/g)
  return m?.length ?? 0
}

function main() {
  const legacyRoot = resolveLegacyRoot()
  let featuresDir = path.join(legacyRoot, 'features')
  let relBase = legacyRoot
  if (!fs.existsSync(featuresDir)) {
    const vendored = path.join(repoRoot, 'features')
    if (fs.existsSync(vendored)) {
      featuresDir = vendored
      relBase = repoRoot
    }
  }

  if (!fs.existsSync(featuresDir)) {
    console.error(JSON.stringify({ error: 'features_dir_missing', legacyRoot, featuresDir }, null, 2))
    process.exitCode = 1
    return
  }

  const files = walkFeatures(featuresDir)
  const perFile = []
  let scenariosTotal = 0
  let tagsTotal = 0
  let visualCaptureScenarios = 0

  for (const file of files.sort()) {
    const rel = path.relative(relBase, file)
    const content = fs.readFileSync(file, 'utf8')
    const scenarios = countScenarioLines(content)
    const tags = countPdfeditorTags(content)
    scenariosTotal += scenarios
    tagsTotal += tags
    if (rel.replace(/\\/g, '/').endsWith('VisualCapture.feature')) visualCaptureScenarios = scenarios
    perFile.push({ file: rel, scenarios, tags })
  }

  const automatableDenominator = scenariosTotal - visualCaptureScenarios

  const payload = {
    legacyRoot,
    featuresDir,
    relBase,
    generatedAt: new Date().toISOString(),
    counts: {
      featureFiles: files.length,
      scenariosTotal,
      visualCaptureScenarios,
      scenariosAutomatableExclVisualCapture: automatableDenominator,
      pdfeditorTagOccurrences: tagsTotal
    },
    perFile,
    ratiosHint: {
      note:
        'El numerador de paridad (Hecho/Parcial) se mantiene en docs/PORTING_STATUS.md. Ejemplo documentado: ~5–5.5 escenarios fuertes sobre 84.',
      formulaA: 'hechoEscenarios / scenariosTotal',
      formulaAprime: 'hechoEscenarios / scenariosAutomatableExclVisualCapture'
    }
  }

  console.log(JSON.stringify(payload, null, 2))
}

main()
