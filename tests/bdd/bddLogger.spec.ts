import { test, expect } from '@playwright/test'
import {
  bddLog,
  logScenarioEnd,
  logScenarioStart,
  printBanner,
  resetBddLoggerStateForTests,
  resolveBddLogLevel
} from './bddLogger'

const ENV_KEYS = ['BDD_LOG_LEVEL', 'CI'] as const

function withEnv(
  vars: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>,
  run: () => void
): void {
  const previous: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) {
    previous[key] = process.env[key]
    if (!(key in vars) || vars[key] === undefined) delete process.env[key]
    else process.env[key] = vars[key]
  }
  try {
    run()
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
}

test.describe('resolveBddLogLevel', () => {
  test('maps explicit DEBUG / SILENT aliases and unknown values', () => {
    expect(resolveBddLogLevel({ BDD_LOG_LEVEL: 'debug' })).toBe('DEBUG')
    expect(resolveBddLogLevel({ BDD_LOG_LEVEL: ' silent ' })).toBe('SILENT')
    expect(resolveBddLogLevel({ BDD_LOG_LEVEL: 'OFF' })).toBe('SILENT')
    expect(resolveBddLogLevel({ BDD_LOG_LEVEL: '0' })).toBe('SILENT')
    expect(resolveBddLogLevel({ BDD_LOG_LEVEL: 'verbose' })).toBe('INFO')
  })

  test('defaults to INFO in CI and DEBUG locally when unset', () => {
    expect(resolveBddLogLevel({ CI: 'true' })).toBe('INFO')
    expect(resolveBddLogLevel({})).toBe('DEBUG')
  })

  test('explicit BDD_LOG_LEVEL wins over CI', () => {
    expect(resolveBddLogLevel({ CI: '1', BDD_LOG_LEVEL: 'DEBUG' })).toBe('DEBUG')
    expect(resolveBddLogLevel({ CI: '1', BDD_LOG_LEVEL: 'SILENT' })).toBe('SILENT')
  })
})

test.describe('bddLogger SILENT gating', () => {
  test.beforeEach(() => {
    resetBddLoggerStateForTests()
  })

  test.afterEach(() => {
    resetBddLoggerStateForTests()
  })

  test('suppresses info/warn/debug/banner/scenario logs when SILENT', () => {
    withEnv({ BDD_LOG_LEVEL: 'SILENT', CI: undefined }, () => {
      const lines: string[] = []
      const original = console.log
      console.log = (...args: unknown[]) => {
        lines.push(args.map(String).join(' '))
      }
      try {
        printBanner()
        logScenarioStart('Silent scenario')
        bddLog.info('Scope', 'should stay quiet')
        bddLog.warn('Scope', 'should stay quiet')
        bddLog.debug('Home', 'should stay quiet')
        logScenarioEnd('Silent scenario', true, 'https://example.com')
        expect(lines).toEqual([])
      } finally {
        console.log = original
      }
    })
  })

  test('error logs still emit under SILENT', () => {
    withEnv({ BDD_LOG_LEVEL: 'SILENT' }, () => {
      const lines: string[] = []
      const original = console.log
      console.log = (...args: unknown[]) => {
        lines.push(args.map(String).join(' '))
      }
      try {
        bddLog.error('Scope', 'must surface')
        expect(lines).toHaveLength(1)
        expect(lines[0]).toContain('[Scope]')
        expect(lines[0]).toContain('must surface')
      } finally {
        console.log = original
      }
    })
  })
})
