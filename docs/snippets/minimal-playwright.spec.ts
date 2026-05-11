/**
 * Plantilla copiable: copia este archivo a `tests/<area>/mi-flujo.spec.ts` (ruta bajo `tests/`
 * y sufijo `.spec.ts`). Ajusta el import de helpers según la profundidad (desde `tests/seo/`
 * o `tests/smoke/` → `../helpers/...`). Ver docs/ADDING_PLAYWRIGHT_TESTS.md.
 */
import { test, expect } from '@playwright/test'
import { openHome } from '../helpers/navigation'

test.describe('Mi área — descripción', { tag: ['@PDFEDITOR_MI_GRUPO'] }, () => {
  test('caso concreto', { tag: ['@PDFEDITOR_MI_TAG_LEGACY'] }, async ({ page }) => {
    await openHome(page)
    await expect(page.locator('main')).toBeVisible()
  })
})
