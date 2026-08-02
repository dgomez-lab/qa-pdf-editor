import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  resolveLegacyRoot,
  syncLegacyElements,
  walkElementsJson
} from './sync-legacy-elements.mjs'

test.describe('sync-legacy-elements helpers', () => {
  test('resolveLegacyRoot honors LEGACY_REPO and defaults beside repo root', () => {
    expect(resolveLegacyRoot('/workspace/qa-pdf-editor', { LEGACY_REPO: '  /tmp/custom-legacy  ' })).toBe(
      path.resolve('/tmp/custom-legacy')
    )
    expect(resolveLegacyRoot('/workspace/qa-pdf-editor', {})).toBe(
      path.resolve('/workspace/qai-pa-pdf-editor')
    )
  })

  test('walkElementsJson collects nested elements.json and skips missing roots', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-sync-legacy-walk-'))
    const nested = path.join(root, 'editor', 'nested')
    fs.mkdirSync(nested, { recursive: true })
    const a = path.join(root, 'elements.json')
    const b = path.join(nested, 'elements.json')
    fs.writeFileSync(a, '{}')
    fs.writeFileSync(b, '{}')
    fs.writeFileSync(path.join(root, 'other.json'), '{}')

    expect(walkElementsJson(root).sort()).toEqual([a, b].sort())
    expect(walkElementsJson(path.join(root, 'missing'))).toEqual([])

    fs.rmSync(root, { recursive: true, force: true })
  })

  test('syncLegacyElements copies elements.json and common page elements', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-sync-legacy-'))
    const legacyRoot = path.join(root, 'legacy')
    const repoRoot = path.join(root, 'current')
    const pages = path.join(legacyRoot, 'src', 'pages')
    const editorDir = path.join(pages, 'editor')
    const componentsDir = path.join(pages, 'components')
    fs.mkdirSync(editorDir, { recursive: true })
    fs.mkdirSync(componentsDir, { recursive: true })
    fs.mkdirSync(repoRoot, { recursive: true })
    fs.writeFileSync(path.join(editorDir, 'elements.json'), '{"editor":true}')
    fs.writeFileSync(path.join(componentsDir, 'pdfCommonPageElements.json'), '{"common":true}')

    const result = syncLegacyElements({ repoRoot, legacyRoot })
    expect(result.ok).toBe(true)
    expect(result.copied).toBe(2)
    expect(
      fs.readFileSync(path.join(repoRoot, 'tests/bdd/legacy-elements/editor/elements.json'), 'utf8')
    ).toBe('{"editor":true}')
    expect(
      fs.readFileSync(
        path.join(repoRoot, 'tests/bdd/legacy-elements/components/pdfCommonPageElements.json'),
        'utf8'
      )
    ).toBe('{"common":true}')

    fs.rmSync(root, { recursive: true, force: true })
  })

  test('syncLegacyElements reports missing legacy pages without throwing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-sync-legacy-missing-'))
    const result = syncLegacyElements({
      repoRoot: root,
      legacyRoot: path.join(root, 'no-such-legacy')
    })
    expect(result.ok).toBe(false)
    expect(result.copied).toBe(0)
    expect(result.error).toMatch(/Legacy pages not found/)
    fs.rmSync(root, { recursive: true, force: true })
  })
})
