import { test, expect } from '@playwright/test'
import {
  formatPickleStepText,
  gherkinKeywordForStepType,
  statusMarkFor
} from './terminalStepsFormatter'

test.describe('terminalStepsFormatter marks and keywords', () => {
  test('statusMarkFor maps known Cucumber statuses and falls back for unknowns', () => {
    expect(statusMarkFor('PASSED')).toBe('✔')
    expect(statusMarkFor('FAILED')).toBe('✖')
    expect(statusMarkFor('SKIPPED')).toBe('-')
    expect(statusMarkFor('PENDING')).toBe('-')
    expect(statusMarkFor('AMBIGUOUS')).toBe('?')
    expect(statusMarkFor('UNDEFINED')).toBe('?')
    expect(statusMarkFor(undefined)).toBe('?')
    expect(statusMarkFor('UNKNOWN_STATUS')).toBe('?')
  })

  test('gherkinKeywordForStepType maps Context/Action and defaults Outcome to Then', () => {
    expect(gherkinKeywordForStepType('Context')).toBe('Given ')
    expect(gherkinKeywordForStepType('Action')).toBe('When ')
    expect(gherkinKeywordForStepType('Outcome')).toBe('Then ')
    expect(gherkinKeywordForStepType(undefined)).toBe('Then ')
  })

  test('formatPickleStepText prefixes readable Gherkin text and ignores empty steps', () => {
    expect(
      formatPickleStepText({
        text: 'I open the home page',
        type: 'Context'
      } as never)
    ).toBe('Given I open the home page')
    expect(
      formatPickleStepText({
        text: 'I submit payment',
        type: 'Action'
      } as never)
    ).toBe('When I submit payment')
    expect(
      formatPickleStepText({
        text: 'I see the receipt',
        type: 'Outcome'
      } as never)
    ).toBe('Then I see the receipt')
    expect(formatPickleStepText(undefined)).toBeUndefined()
    expect(formatPickleStepText({ text: '', type: 'Action' } as never)).toBeUndefined()
  })
})
