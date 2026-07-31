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
 *   Si no existe `features/` del legacy: **1** salvo `SKIP_LEGACY_TAG_CHECK=1` (p. ej. CI sin clonar
 *   `qai-pa-pdf-editor`) → **0** con aviso en stderr.
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

export function walkFiles(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walkFiles(p, pred, acc)
    else if (name.isFile() && pred(p)) acc.push(p)
  }
  return acc
}

export function extractTags(content) {
  const out = new Set()
  const re = /@PDFEDITOR_[A-Z0-9_]+/g
  let m
  while ((m = re.exec(content)) !== null) out.add(m[0])
  return out
}

export function collectLegacyTags(featuresDir) {
  const files = walkFiles(featuresDir, (p) => p.endsWith('.feature'))
  const tags = new Set()
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8')
    for (const t of extractTags(c)) tags.add(t)
  }
  return tags
}

export function resolveFeaturesDir(legacyRoot, currentRepoRoot) {
  const legacyFeatures = path.join(legacyRoot, 'features')
  if (fs.existsSync(legacyFeatures)) {
    return { featuresDir: legacyFeatures, featuresSource: 'legacy_clone' }
  }
  const vendored = path.join(currentRepoRoot, 'features')
  if (fs.existsSync(vendored)) {
    return { featuresDir: vendored, featuresSource: 'vendored_repo_root' }
  }
  return { featuresDir: legacyFeatures, featuresSource: 'missing' }
}

export function collectPlaywrightTags(currentRepoRoot) {
  const featuresDir = path.join(currentRepoRoot, 'features')
  const generatedDir = path.join(currentRepoRoot, '.features-gen')
  const files = [
    ...walkFiles(featuresDir, (p) => p.endsWith('.feature')),
    ...walkFiles(generatedDir, (p) => p.endsWith('.spec.ts'))
  ]
  const tags = new Set()
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8')
    for (const t of extractTags(c)) tags.add(t)
  }
  return tags
}

export function diffTagSets(legacy, ours) {
  return {
    missingFromPlaywright: [...legacy].filter((t) => !ours.has(t)).sort(),
    extraInPlaywright: [...ours].filter((t) => !legacy.has(t)).sort()
  }
}

export function shouldSkipMissingLegacyFeatures(env = process.env) {
  const skip = env.SKIP_LEGACY_TAG_CHECK
  return skip === '1' || skip === 'true' || skip === 'yes'
}

function main() {
  const legacyRoot = resolveLegacyRoot()
  const { featuresDir, featuresSource } = resolveFeaturesDir(legacyRoot, repoRoot)
  if (featuresSource === 'missing') {
    const skip = shouldSkipMissingLegacyFeatures()
    if (skip) {
      console.warn(
        JSON.stringify(
          {
            warning: 'features_dir_missing_skipped',
            message:
              'No hay `features/` en el clon legacy ni en la raíz de este repo. Paridad de tags omitida. Clona qai-pa-pdf-editor junto al repo, define LEGACY_REPO, o commitea `features/` vendored.',
            legacyRoot,
            featuresDir
          },
          null,
          2
        )
      )
      process.exitCode = 0
      return
    }
    console.error(JSON.stringify({ error: 'features_dir_missing', legacyRoot, featuresDir }, null, 2))
    process.exitCode = 1
    return
  }

  const legacy = collectLegacyTags(featuresDir)
  const ours = collectPlaywrightTags(repoRoot)
  const { missingFromPlaywright: missing, extraInPlaywright: extra } = diffTagSets(legacy, ours)

  const payload = {
    legacyRoot,
    featuresDir,
    featuresSource,
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

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isMain) {
  main()
}
