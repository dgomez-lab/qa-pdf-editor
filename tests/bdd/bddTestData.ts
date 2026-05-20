import type { DataTable } from 'playwright-bdd'
import type { BddWorld } from './fixtures'

export function mergeTestDataFromTable(w: BddWorld, table: DataTable): void {
  const row = table.hashes()[0]
  if (!row) throw new Error('Test data table has no rows')
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim()
    w.testData[key] = (v ?? '').trim()
  }
  const em = w.testData.email?.trim()
  if (em) w.email = em
}
