import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  countPdfeditorTags,
  countScenarioLines,
  resolveFeaturesDir,
  resolveLegacyRoot,
  summarizeFeaturesDir
} from './porting-parity-stats.mjs'

test.describe('porting-parity-stats helpers', () => {
  test('countScenarioLines counts Scenario and Scenario Outline lines only', () => {
    const content = `
      Feature: Demo
      Scenario: one
        Given something
      Scenario Outline: many
        When <x>
      Examples:
        | x |
        | 1 |
      # Scenario: commented
      Background:
        Given setup
    `
    expect(countScenarioLines(content)).toBe(2)
    expect(countScenarioLines('')).toBe(0)
  })

  test('countPdfeditorTags counts every @PDFEDITOR_* occurrence including duplicates', () => {
    const content = `
      @PDFEDITOR_SEO_HOME
      @smoke
      @PDFEDITOR_SEO_HOME
      @PDFEDITOR_PAYMENT_FIRST_REFUND_VISA
      Scenario: example
    `
    expect(countPdfeditorTags(content)).toBe(3)
    expect(countPdfeditorTags('@pdfeditor_lower @OTHER')).toBe(0)
  })

  test('resolveFeaturesDir prefers legacy clone, then vendored features, else missing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-parity-stats-'))
    const legacyRoot = path.join(root, 'legacy')
    const currentRoot = path.join(root, 'current')
    fs.mkdirSync(path.join(currentRoot, 'features'), { recursive: true })

    expect(resolveFeaturesDir(legacyRoot, currentRoot)).toEqual({
      featuresDir: path.join(currentRoot, 'features'),
      relBase: currentRoot,
      featuresSource: 'vendored_repo_root'
    })

    fs.mkdirSync(path.join(legacyRoot, 'features'), { recursive: true })
    expect(resolveFeaturesDir(legacyRoot, currentRoot)).toEqual({
      featuresDir: path.join(legacyRoot, 'features'),
      relBase: legacyRoot,
      featuresSource: 'legacy_clone'
    })

    fs.rmSync(path.join(legacyRoot, 'features'), { recursive: true, force: true })
    fs.rmSync(path.join(currentRoot, 'features'), { recursive: true, force: true })
    expect(resolveFeaturesDir(legacyRoot, currentRoot)).toEqual({
      featuresDir: path.join(legacyRoot, 'features'),
      relBase: legacyRoot,
      featuresSource: 'missing'
    })

    fs.rmSync(root, { recursive: true, force: true })
  })

  test('resolveLegacyRoot honors LEGACY_REPO and summarizeFeaturesDir excludes VisualCapture from automatable', () => {
    const prev = process.env.LEGACY_REPO
    process.env.LEGACY_REPO = '  /tmp/custom-legacy-parity  '
    try {
      expect(resolveLegacyRoot('/workspace')).toBe(path.resolve('/tmp/custom-legacy-parity'))
    } finally {
      if (prev === undefined) delete process.env.LEGACY_REPO
      else process.env.LEGACY_REPO = prev
    }

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-parity-sum-'))
    const featuresDir = path.join(root, 'features')
    const paymentDir = path.join(featuresDir, 'payment')
    fs.mkdirSync(paymentDir, { recursive: true })
    fs.writeFileSync(
      path.join(featuresDir, 'SEO.feature'),
      `@PDFEDITOR_SEO_HOME\nScenario: home\n@PDFEDITOR_SEO_FORMS\nScenario: forms\n`
    )
    fs.writeFileSync(
      path.join(featuresDir, 'VisualCapture.feature'),
      `@MANUAL_SCREEN_CAPTURE\nScenario: capture one\nScenario Outline: capture many\n`
    )
    fs.writeFileSync(
      path.join(paymentDir, 'FirstPayment.feature'),
      `@PDFEDITOR_PAYMENT_FIRST\nScenario: pay\n`
    )

    const summary = summarizeFeaturesDir(featuresDir, root)
    expect(summary.featureFiles).toBe(3)
    expect(summary.scenariosTotal).toBe(5)
    expect(summary.visualCaptureScenarios).toBe(2)
    expect(summary.scenariosAutomatableExclVisualCapture).toBe(3)
    expect(summary.pdfeditorTagOccurrences).toBe(3)
    expect(summary.perFile.map((row) => row.file.replace(/\\/g, '/'))).toEqual([
      'features/SEO.feature',
      'features/VisualCapture.feature',
      'features/payment/FirstPayment.feature'
    ])

    fs.rmSync(root, { recursive: true, force: true })
  })
})
