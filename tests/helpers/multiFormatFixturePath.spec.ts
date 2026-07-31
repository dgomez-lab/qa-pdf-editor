import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fixturePathFor } from './multiFormatUpload'

const repoFixtures = path.join(__dirname, '..', 'fixtures')

test.describe('multiFormatUpload fixturePathFor', () => {
  test('resolves committed sample fixtures under tests/fixtures', () => {
    expect(fixturePathFor('PDF')).toBe(path.join(repoFixtures, 'sample.pdf'))
    expect(fixturePathFor('DOCX')).toBe(path.join(repoFixtures, 'sample.docx'))
    expect(fixturePathFor('JPEG')).toBe(path.join(repoFixtures, 'sample.jpeg'))
  })

  test('uses PLAYWRIGHT_FIXTURE_<FORMAT> when the direct sample file is absent', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-fixture-empty-'))
    const envFile = path.join(dir, 'custom.docx')
    fs.writeFileSync(envFile, 'docx')
    const prev = process.env.PLAYWRIGHT_FIXTURE_DOCX
    process.env.PLAYWRIGHT_FIXTURE_DOCX = `  ${envFile}  `
    try {
      expect(fixturePathFor('DOCX', { fixturesDir: dir })).toBe(envFile)
    } finally {
      if (prev === undefined) delete process.env.PLAYWRIGHT_FIXTURE_DOCX
      else process.env.PLAYWRIGHT_FIXTURE_DOCX = prev
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('returns null when neither fixture file nor env override exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-fixture-missing-'))
    const prev = process.env.PLAYWRIGHT_FIXTURE_PPTX
    delete process.env.PLAYWRIGHT_FIXTURE_PPTX
    try {
      expect(fixturePathFor('PPTX', { fixturesDir: dir })).toBeNull()
    } finally {
      if (prev === undefined) delete process.env.PLAYWRIGHT_FIXTURE_PPTX
      else process.env.PLAYWRIGHT_FIXTURE_PPTX = prev
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('ignores blank or missing env override paths', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-fixture-blank-'))
    const prev = process.env.PLAYWRIGHT_FIXTURE_PNG
    process.env.PLAYWRIGHT_FIXTURE_PNG = '   '
    try {
      expect(fixturePathFor('PNG', { fixturesDir: dir })).toBeNull()
      process.env.PLAYWRIGHT_FIXTURE_PNG = path.join(dir, 'does-not-exist.png')
      expect(fixturePathFor('PNG', { fixturesDir: dir })).toBeNull()
    } finally {
      if (prev === undefined) delete process.env.PLAYWRIGHT_FIXTURE_PNG
      else process.env.PLAYWRIGHT_FIXTURE_PNG = prev
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
