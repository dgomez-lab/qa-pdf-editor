import { test, expect } from '@playwright/test'
import type { DataTable } from 'playwright-bdd'
import { mergeTestDataFromTable } from '../bdd/bddTestData'
import type { BddWorld } from '../bdd/fixtures'

function tableFromRows(rows: Record<string, string | undefined>[]): DataTable {
  return {
    hashes: () => rows
  } as unknown as DataTable
}

function bddWorld(testData: Record<string, string> = {}, email = 'existing@example.test'): BddWorld {
  return {
    testData,
    email,
    recurrenceNumber: 0,
    currentPage: 'Home',
    crmPage: null,
    popup: null
  }
}

test.describe('mergeTestDataFromTable', () => {
  test('trims table keys and values and mirrors a nonblank email to the world', () => {
    const world = bddWorld()

    mergeTestDataFromTable(
      world,
      tableFromRows([
        {
          ' email ': ' new-user@example.test ',
          ' ip ': ' ES ',
          blank: undefined
        }
      ])
    )

    expect(world.testData).toEqual({
      email: 'new-user@example.test',
      ip: 'ES',
      blank: ''
    })
    expect(world.email).toBe('new-user@example.test')
  })

  test('preserves the existing world email when table email is blank', () => {
    const world = bddWorld({ email: 'previous@example.test' }, 'previous@example.test')

    mergeTestDataFromTable(world, tableFromRows([{ email: '   ', ip: 'US' }]))

    expect(world.testData).toEqual({ email: '', ip: 'US' })
    expect(world.email).toBe('previous@example.test')
  })

  test('throws when the data table has no rows', () => {
    const world = bddWorld()

    expect(() => mergeTestDataFromTable(world, tableFromRows([]))).toThrow('Test data table has no rows')
  })
})
