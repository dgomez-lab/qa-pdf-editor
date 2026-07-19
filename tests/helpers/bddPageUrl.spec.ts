import { test, expect } from '@playwright/test'
import { urlRegexForPage } from '../bdd/stepHelpers'

test.describe('BDD page URL matching', () => {
  test('accepts supported editor URL endings', () => {
    const editorUrl = urlRegexForPage(' Editor ')

    expect(editorUrl.test('https://red.mvps.website/editor')).toBe(true)
    expect(editorUrl.test('https://red.mvps.website/editor/')).toBe(true)
    expect(editorUrl.test('https://red.mvps.website/editor?x-token-qa=value')).toBe(true)
  })

  test('rejects locale home pages and editor-like paths', () => {
    const editorUrl = urlRegexForPage('editor')

    expect(editorUrl.test('https://red.mvps.website/en/')).toBe(false)
    expect(editorUrl.test('https://red.mvps.website/fr?x-token-qa=value')).toBe(false)
    expect(editorUrl.test('https://red.mvps.website/editorial')).toBe(false)
  })
})
