import type { Page } from '@playwright/test'

/**
 * Raíz de contenido en páginas marketing: muchos sitios usan `<main>`; en MVPS
 * (p. ej. mergedpdf en `red.mvps.website`) el layout puede omitir `<main>` y usar
 * solo `generic` + títulos (`/faqs` usa `h3` sin `h1`).
 */
export function marketingMainOrHero(page: Page) {
  return page.locator('main, h1, h2, h3').first()
}
