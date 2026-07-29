import { expect, test } from '@playwright/test'
import { currentBaseUrl, isMvpsMergedStage, marketingAboutPath } from './siteContext'

function withBaseUrl(value: string | undefined, run: () => void): void {
  const previous = process.env.BASE_URL
  if (value === undefined) delete process.env.BASE_URL
  else process.env.BASE_URL = value
  try {
    run()
  } finally {
    if (previous === undefined) delete process.env.BASE_URL
    else process.env.BASE_URL = previous
  }
}

test.describe('siteContext', () => {
  test('currentBaseUrl trims and lowercases BASE_URL', () => {
    withBaseUrl('  HTTPS://Red.MVPS.Website/?x=1  ', () => {
      expect(currentBaseUrl()).toBe('https://red.mvps.website/?x=1')
    })
  })

  test('treats unset BASE_URL as non-MVPS and uses /about', () => {
    withBaseUrl(undefined, () => {
      expect(currentBaseUrl()).toBe('')
      expect(isMvpsMergedStage()).toBe(false)
      expect(marketingAboutPath()).toBe('/about')
    })
  })

  test('detects MVPS merged stages and routes about to /about-us', () => {
    withBaseUrl('https://red3.mvps.website/?x-token-qa=test', () => {
      expect(isMvpsMergedStage()).toBe(true)
      expect(marketingAboutPath()).toBe('/about-us')
    })
  })

  test('keeps pdfhint and other hosts on /about', () => {
    withBaseUrl('https://staging.pdfhint.com', () => {
      expect(isMvpsMergedStage()).toBe(false)
      expect(marketingAboutPath()).toBe('/about')
    })
    withBaseUrl('https://staging.pdfmerges.com', () => {
      expect(isMvpsMergedStage()).toBe(false)
      expect(marketingAboutPath()).toBe('/about')
    })
  })
})
