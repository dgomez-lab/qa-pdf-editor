import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { loadConfiguration } from './loadConfiguration'

test.describe('loadConfiguration', () => {
  test('maps headless from JSON even when HEADLESS already set (e.g. from .env)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-config-'))
    const configPath = path.join(dir, 'configuration.json')
    fs.writeFileSync(
      configPath,
      JSON.stringify({ driver: { headless: true }, projectVars: { environment: 'red', app: 'mergedpdf' } })
    )
    process.env.HEADLESS = '0'
    loadConfiguration(configPath)
    expect(process.env.HEADLESS).toBe('1')
    delete process.env.HEADLESS
    fs.rmSync(dir, { recursive: true, force: true })
  })

  test('maps headless and environment without overriding existing env', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-config-'))
    const configPath = path.join(dir, 'configuration.json')
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        driver: { headless: false },
        logLevel: 'INFO',
        projectVars: { environment: 'red3', app: 'mergedpdf' }
      })
    )

    const prevHeadless = process.env.HEADLESS
    const prevEnv = process.env.ENVIRONMENT
    const prevApp = process.env.APP
    delete process.env.HEADLESS
    delete process.env.ENVIRONMENT
    delete process.env.APP

    loadConfiguration(configPath)

    expect(process.env.HEADLESS).toBe('0')
    expect(process.env.ENVIRONMENT).toBe('red3')
    expect(process.env.APP).toBe('mergedpdf')

    if (prevHeadless === undefined) delete process.env.HEADLESS
    else process.env.HEADLESS = prevHeadless
    if (prevEnv === undefined) delete process.env.ENVIRONMENT
    else process.env.ENVIRONMENT = prevEnv
    if (prevApp === undefined) delete process.env.APP
    else process.env.APP = prevApp

    fs.rmSync(dir, { recursive: true, force: true })
  })

  test('maps pdfhint baseUrl and appendQaToken', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-config-'))
    const configPath = path.join(dir, 'pdfhint.json')
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        projectVars: {
          baseUrl: 'https://staging.pdfhint.com',
          app: 'pdfhint',
          appendQaToken: false,
          emailSubjectBrandPrefix: 'pdfhint'
        }
      })
    )

    const keys = ['BASE_URL', 'APP', 'APPEND_QA_TOKEN', 'EMAIL_SUBJECT_BRAND_PREFIX'] as const
    const saved: Record<string, string | undefined> = {}
    for (const k of keys) {
      saved[k] = process.env[k]
      delete process.env[k]
    }

    loadConfiguration(configPath)

    expect(process.env.BASE_URL).toBe('https://staging.pdfhint.com')
    expect(process.env.APP).toBe('pdfhint')
    expect(process.env.APPEND_QA_TOKEN).toBe('false')
    expect(process.env.EMAIL_SUBJECT_BRAND_PREFIX).toBe('pdfhint')

    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }

    fs.rmSync(dir, { recursive: true, force: true })
  })
})
