import { test, expect } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'

const ENV_KEYS = [
  'APP',
  'BASE_URL',
  'ENVIRONMENT',
  'GITHUB_ACTIONS',
  'MVPS_SLOT',
  'PDFHINT_BASE_URL',
  'PLAYWRIGHT_APP',
  'QAI_TOKEN_PARAM'
]

let savedEnv: Record<string, string | undefined>

test.describe('Config — resolve base URL', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    savedEnv = {}
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  test.afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = savedEnv[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  test('usa mergedpdf en GitHub Actions cuando APP y PLAYWRIGHT_APP están vacíos', async () => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = '   '

    expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
  })

  test('mantiene pdfhint por defecto fuera de GitHub Actions con APP vacío', async () => {
    process.env.APP = ''
    process.env.PLAYWRIGHT_APP = '   '

    expect(resolvePlaywrightBaseUrl()).toBe('https://staging.pdfhint.com')
  })

  test('usa PLAYWRIGHT_APP cuando APP solo contiene espacios', async () => {
    process.env.APP = '   '
    process.env.PLAYWRIGHT_APP = 'mergedpdf'
    process.env.MVPS_SLOT = '4'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red4.mvps.website')
  })

  test('normaliza BASE_URL de MVPS y conserva el token QA para navegaciones posteriores', async () => {
    process.env.BASE_URL = 'https://red2.mvps.website/?custom_token=abc123'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red2.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('custom_token=abc123')
  })

  test('no reemplaza un token QA explícito al normalizar BASE_URL de MVPS', async () => {
    process.env.BASE_URL = 'https://red.mvps.website/?x-token-qa=from-url'
    process.env.QAI_TOKEN_PARAM = 'x-token-qa=from-env'

    expect(resolvePlaywrightBaseUrl()).toBe('https://red.mvps.website')
    expect(process.env.QAI_TOKEN_PARAM).toBe('x-token-qa=from-env')
  })
})
