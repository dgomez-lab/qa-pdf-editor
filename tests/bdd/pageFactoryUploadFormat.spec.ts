import { test, expect } from '@playwright/test'
import { resolveUploadFormatKey } from './pageFactory'

test.describe('resolveUploadFormatKey', () => {
  test('maps known multi-format labels including JPEG alias', () => {
    expect(resolveUploadFormatKey('pdf')).toBe('PDF')
    expect(resolveUploadFormatKey('DOCX')).toBe('DOCX')
    expect(resolveUploadFormatKey('png')).toBe('PNG')
    expect(resolveUploadFormatKey('JPG')).toBe('JPG')
    expect(resolveUploadFormatKey('jpeg')).toBe('JPG')
    expect(resolveUploadFormatKey('XLSX')).toBe('XLSX')
    expect(resolveUploadFormatKey('pptx')).toBe('PPTX')
  })

  test('defaults unknown or blank formats to PDF', () => {
    expect(resolveUploadFormatKey('TIFF')).toBe('PDF')
    expect(resolveUploadFormatKey('')).toBe('PDF')
    expect(resolveUploadFormatKey('  ')).toBe('PDF')
  })
})
