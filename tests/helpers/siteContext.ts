/**
 * Heurísticas según `BASE_URL` (resuelta en `playwright.config.ts` vía `resolvePlaywrightBaseUrl`).
 */

export function currentBaseUrl(): string {
  return (process.env.BASE_URL || '').trim().toLowerCase()
}

/** Entornos dinámicos tipo `red.mvps.website` (mergedpdf / Cucumber `projectVars.environment`). */
export function isMvpsMergedStage(): boolean {
  return currentBaseUrl().includes('mvps.website')
}

/** Ruta marketing “Quiénes somos”: en MVPS suele ser `/about-us`; en pdfhint `/about`. */
export function marketingAboutPath(): string {
  return isMvpsMergedStage() ? '/about-us' : '/about'
}
