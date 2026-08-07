import { test, expect } from '@playwright/test'
import * as path from 'node:path'
import {
  isConfigurationJsonEnvKey,
  resolveConfigurationPath
} from './loadConfiguration'

test.describe('configuration path and env key contracts', () => {
  test('allow-lists only configuration.json-owned env keys', () => {
    expect(isConfigurationJsonEnvKey('BASE_URL')).toBe(true)
    expect(isConfigurationJsonEnvKey('APPEND_QA_TOKEN')).toBe(true)
    expect(isConfigurationJsonEnvKey('PLAYWRIGHT_CRM_PASSWORD')).toBe(false)
    expect(isConfigurationJsonEnvKey('PLAYWRIGHT_MAILPIT_USER')).toBe(false)
    expect(isConfigurationJsonEnvKey('QAI_TOKEN_PARAM')).toBe(false)
  })

  test('resolveConfigurationPath honors absolute and relative QAI_PA_CONFIGURATION_PATH', () => {
    const previous = process.env.QAI_PA_CONFIGURATION_PATH
    try {
      process.env.QAI_PA_CONFIGURATION_PATH = '/tmp/custom-configuration.json'
      expect(resolveConfigurationPath()).toBe('/tmp/custom-configuration.json')

      process.env.QAI_PA_CONFIGURATION_PATH = 'config/configuration.pdfhint.json'
      expect(resolveConfigurationPath()).toBe(
        path.join(process.cwd(), 'config', 'configuration.pdfhint.json')
      )

      delete process.env.QAI_PA_CONFIGURATION_PATH
      expect(resolveConfigurationPath()).toBe(path.join(process.cwd(), 'config', 'configuration.json'))
    } finally {
      if (previous === undefined) delete process.env.QAI_PA_CONFIGURATION_PATH
      else process.env.QAI_PA_CONFIGURATION_PATH = previous
    }
  })
})
