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

export function resolveLegacyRoot(root = repoRoot) {
  const env = process.env.LEGACY_REPO?.trim()
  if (env) return path.resolve(env)
  return path.resolve(root, '..', 'qai-pa-pdf-editor')
}

export function walkFeatures(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walkFeatures(p, acc)
    else if (name.isFile() && name.name.endsWith('.feature')) acc.push(p)
  }
  return acc
}

export function countScenarioLines(content) {
  const re = /^\s*(Scenario|Scenario Outline)\s*:/gim
  const m = content.match(re)
  return m?.length ?? 0
}

export function countPdfeditorTags(content) {
  const m = content.match(/@PDFEDITOR_[A-Z0-9_]+/g)
  return m?.length ?? 0
}

export function resolveFeaturesDir(legacyRoot, currentRepoRoot) {
  const legacyFeatures = path.join(legacyRoot, 'features')
  if (fs.existsSync(legacyFeatures)) {
    return { featuresDir: legacyFeatures, relBase: legacyRoot, featuresSource: 'legacy_clone' }
  }
  const vendored = path.join(currentRepoRoot, 'features')
  if (fs.existsSync(vendored)) {
    return { featuresDir: vendored, relBase: currentRepoRoot, featuresSource: 'vendored_repo_root' }
  }
  return { featuresDir: legacyFeatures, relBase: legacyRoot, featuresSource: 'missing' }
}

export function summarizeFeaturesDir(featuresDir, relBase) {
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

  return {
    featureFiles: files.length,
    scenariosTotal,
    visualCaptureScenarios,
    scenariosAutomatableExclVisualCapture: scenariosTotal - visualCaptureScenarios,
    pdfeditorTagOccurrences: tagsTotal,
    perFile
  }
}

function main() {
  const legacyRoot = resolveLegacyRoot()
  const { featuresDir, relBase, featuresSource } = resolveFeaturesDir(legacyRoot, repoRoot)

  if (featuresSource === 'missing') {
    console.error(JSON.stringify({ error: 'features_dir_missing', legacyRoot, featuresDir }, null, 2))
    process.exitCode = 1
    return
  }

  const counts = summarizeFeaturesDir(featuresDir, relBase)

  const payload = {
    legacyRoot,
    featuresDir,
    relBase,
    generatedAt: new Date().toISOString(),
    counts: {
      featureFiles: counts.featureFiles,
      scenariosTotal: counts.scenariosTotal,
      visualCaptureScenarios: counts.visualCaptureScenarios,
      scenariosAutomatableExclVisualCapture: counts.scenariosAutomatableExclVisualCapture,
      pdfeditorTagOccurrences: counts.pdfeditorTagOccurrences
    },
    perFile: counts.perFile,
    ratiosHint: {
      note:
        'El numerador de paridad (Hecho/Parcial) se mantiene en docs/PORTING_STATUS.md. Ejemplo documentado: ~5–5.5 escenarios fuertes sobre 84.',
      formulaA: 'hechoEscenarios / scenariosTotal',
      formulaAprime: 'hechoEscenarios / scenariosAutomatableExclVisualCapture'
    }
  }

  console.log(JSON.stringify(payload, null, 2))
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isMain) {
  main()
}
