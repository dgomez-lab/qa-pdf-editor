import { test, expect } from '@playwright/test'
import { collectFormsPathLinkErrors, normalizeFormsPathname } from './pdfhintFormsSeo'

test.describe('pdfhintFormsSeo pathname matching', () => {
  test('normalizeFormsPathname strips a single trailing slash except root', () => {
    expect(normalizeFormsPathname('/')).toBe('/')
    expect(normalizeFormsPathname('/lp/w2-form')).toBe('/lp/w2-form')
    expect(normalizeFormsPathname('/lp/w2-form/')).toBe('/lp/w2-form')
  })

  test('accepts absolute, relative, and trailing-slash hrefs for expected pathnames', () => {
    const errors = collectFormsPathLinkErrors(
      [
        'https://staging.pdfhint.com/lp/w2-form/',
        '/lp/form-w9',
        '  /lp/1040-form  ',
        null,
        '',
        'https://example.com/not-a-form'
      ],
      ['/lp/w2-form', '/lp/form-w9', '/lp/1040-form'],
      'https://staging.pdfhint.com'
    )
    expect(errors).toEqual([])
  })

  test('reports missing pathnames and ignores malformed hrefs', () => {
    const errors = collectFormsPathLinkErrors(
      ['/lp/w2-form', '::not-a-url', 'https://staging.pdfhint.com/lp/other'],
      ['/lp/w2-form', '/lp/form-w9/', '/lp/da-31'],
      'https://staging.pdfhint.com'
    )
    expect(errors).toEqual([
      'forms grid: missing link with pathname /lp/form-w9/',
      'forms grid: missing link with pathname /lp/da-31'
    ])
  })
})
