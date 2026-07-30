import { test, expect } from '@playwright/test'
import { landingPathFor } from './multiFormatUpload'

test.describe('multiFormatUpload landingPathFor', () => {
  test('maps known legacy landing slugs to lp pathnames', () => {
    expect(landingPathFor('wordToPDF')).toBe('/lp/word-to-pdf')
    expect(landingPathFor('compressPDF')).toBe('/lp/compress-pdf')
    expect(landingPathFor('insertImage')).toBe('/lp/add-image-to-pdf')
    expect(landingPathFor('howToConvertPdfWord')).toBe('/lp/pdf-to-word')
    expect(landingPathFor('mergePDF')).toBe('/lp/merge-pdf')
  })

  test('falls back to lowercased slug under /lp for unknown keys', () => {
    expect(landingPathFor('CustomTool')).toBe('/lp/customtool')
  })
})
