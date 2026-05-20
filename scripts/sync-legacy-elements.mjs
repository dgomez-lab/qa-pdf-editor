#!/usr/bin/env node
/**
 * Copia `src/pages/**/elements.json` del legacy a `tests/bdd/legacy-elements/**`.
 *
 * Uso:
 *   npm run sync:legacy-elements
 *   LEGACY_REPO=/ruta/a/qai-pa-pdf-editor node scripts/sync-legacy-elements.mjs
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

function walkElementsJson(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walkElementsJson(p, acc)
    else if (name.isFile() && name.name === 'elements.json') acc.push(p)
  }
  return acc
}

function main() {
  const legacyPages = path.join(resolveLegacyRoot(), 'src', 'pages')
  const destRoot = path.join(repoRoot, 'tests', 'bdd', 'legacy-elements')
  const commonSrc = path.join(legacyPages, 'components', 'pdfCommonPageElements.json')
  const commonDst = path.join(destRoot, 'components', 'pdfCommonPageElements.json')

  if (!fs.existsSync(legacyPages)) {
    console.error(`Legacy pages not found: ${legacyPages}`)
    process.exit(1)
  }

  let copied = 0
  for (const src of walkElementsJson(legacyPages)) {
    const rel = path.relative(legacyPages, src)
    const dst = path.join(destRoot, rel)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(src, dst)
    copied += 1
  }

  if (fs.existsSync(commonSrc)) {
    fs.mkdirSync(path.dirname(commonDst), { recursive: true })
    fs.copyFileSync(commonSrc, commonDst)
    copied += 1
  }

  console.log(JSON.stringify({ legacyPages, destRoot, copied }, null, 2))
}

main()
