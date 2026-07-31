import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  diffTagSets,
  extractTags,
  resolveFeaturesDir,
  resolveLegacyRoot,
  shouldSkipMissingLegacyFeatures
} from './porting-tags.mjs'

test.describe('porting-tags helpers', () => {
  test('extractTags keeps unique @PDFEDITOR_* tags and ignores other annotations', () => {
    const tags = extractTags(`
      @smoke
      @PDFEDITOR_SEO_HOME
      Feature: SEO
      @PDFEDITOR_SEO_HOME
      @PDFEDITOR_PAYMENT_FIRST_REFUND_VISA
      Scenario: example
    `)
    expect([...tags].sort()).toEqual([
      '@PDFEDITOR_PAYMENT_FIRST_REFUND_VISA',
      '@PDFEDITOR_SEO_HOME'
    ])
  })

  test('diffTagSets reports sorted missing and extra tags', () => {
    const legacy = new Set(['@PDFEDITOR_A', '@PDFEDITOR_B', '@PDFEDITOR_C'])
    const ours = new Set(['@PDFEDITOR_B', '@PDFEDITOR_C', '@PDFEDITOR_D'])
    expect(diffTagSets(legacy, ours)).toEqual({
      missingFromPlaywright: ['@PDFEDITOR_A'],
      extraInPlaywright: ['@PDFEDITOR_D']
    })
  })

  test('resolveFeaturesDir prefers legacy clone, then vendored features, else missing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-porting-tags-'))
    const legacyRoot = path.join(root, 'legacy')
    const currentRoot = path.join(root, 'current')
    fs.mkdirSync(path.join(currentRoot, 'features'), { recursive: true })

    expect(resolveFeaturesDir(legacyRoot, currentRoot)).toEqual({
      featuresDir: path.join(currentRoot, 'features'),
      featuresSource: 'vendored_repo_root'
    })

    fs.mkdirSync(path.join(legacyRoot, 'features'), { recursive: true })
    expect(resolveFeaturesDir(legacyRoot, currentRoot)).toEqual({
      featuresDir: path.join(legacyRoot, 'features'),
      featuresSource: 'legacy_clone'
    })

    fs.rmSync(path.join(legacyRoot, 'features'), { recursive: true, force: true })
    fs.rmSync(path.join(currentRoot, 'features'), { recursive: true, force: true })
    expect(resolveFeaturesDir(legacyRoot, currentRoot)).toEqual({
      featuresDir: path.join(legacyRoot, 'features'),
      featuresSource: 'missing'
    })

    fs.rmSync(root, { recursive: true, force: true })
  })

  test('resolveLegacyRoot honors LEGACY_REPO and shouldSkipMissingLegacyFeatures accepts truthy flags', () => {
    const prev = process.env.LEGACY_REPO
    process.env.LEGACY_REPO = '  /tmp/custom-legacy  '
    try {
      expect(resolveLegacyRoot('/workspace')).toBe(path.resolve('/tmp/custom-legacy'))
    } finally {
      if (prev === undefined) delete process.env.LEGACY_REPO
      else process.env.LEGACY_REPO = prev
    }

    expect(shouldSkipMissingLegacyFeatures({ SKIP_LEGACY_TAG_CHECK: '1' })).toBe(true)
    expect(shouldSkipMissingLegacyFeatures({ SKIP_LEGACY_TAG_CHECK: 'true' })).toBe(true)
    expect(shouldSkipMissingLegacyFeatures({ SKIP_LEGACY_TAG_CHECK: 'yes' })).toBe(true)
    expect(shouldSkipMissingLegacyFeatures({ SKIP_LEGACY_TAG_CHECK: '0' })).toBe(false)
    expect(shouldSkipMissingLegacyFeatures({})).toBe(false)
  })
})
