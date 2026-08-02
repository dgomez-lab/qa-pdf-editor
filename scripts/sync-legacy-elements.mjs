#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

export function resolveLegacyRoot(root = repoRoot, env = process.env) {
  const legacyEnv = env.LEGACY_REPO?.trim()
  if (legacyEnv) return path.resolve(legacyEnv)
  return path.resolve(root, '..', 'qai-pa-pdf-editor')
}

export function walkElementsJson(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walkElementsJson(p, acc)
    else if (name.isFile() && name.name === 'elements.json') acc.push(p)
  }
  return acc
}

export function syncLegacyElements(options = {}) {
  const root = options.repoRoot ?? repoRoot
  const legacyRoot = options.legacyRoot ?? resolveLegacyRoot(root, options.env ?? process.env)
  const legacyPages = path.join(legacyRoot, 'src', 'pages')
  const destRoot = path.join(root, 'tests', 'bdd', 'legacy-elements')
  const commonSrc = path.join(legacyPages, 'components', 'pdfCommonPageElements.json')
  const commonDst = path.join(destRoot, 'components', 'pdfCommonPageElements.json')

  if (!fs.existsSync(legacyPages)) {
    return { ok: false, legacyPages, destRoot, copied: 0, error: `Legacy pages not found: ${legacyPages}` }
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

  return { ok: true, legacyPages, destRoot, copied }
}

function main() {
  const result = syncLegacyElements()
  if (!result.ok) {
    console.error(result.error)
    process.exit(1)
  }
  console.log(JSON.stringify({ legacyPages: result.legacyPages, destRoot: result.destRoot, copied: result.copied }, null, 2))
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  main()
}
