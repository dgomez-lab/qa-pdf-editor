# Estado del port Cucumber → Playwright-BDD

La migración quedó consolidada en modo **big-bang**:

- Los `.feature` vendored de `features/**/*.feature` son ahora la fuente única de escenarios.
- La ejecución usa `playwright-bdd` (`npm run bddgen && playwright test`).
- Se retiraron los `tests/**/*.spec.ts` y la carpeta `tests/smoke/`.
- La CI genera tests con `bddgen` antes de ejecutar suites.

## Métrica oficial de paridad

- `npm run porting:tags` compara tags `@PDFEDITOR_*` entre legacy y esta base.
- Resultado esperado: `missingFromPlaywright: []`.
- El análisis toma tags desde `features/` y opcionalmente `.features-gen`.

## Flujo de ejecución

1. `npm run bddgen`
2. `playwright test` (o `npm run test:tag -- @TAG`)

La configuración Playwright apunta al output `.features-gen` y reutiliza snapshots visuales en `tests/visual/baseline`.

## Estructura relevante

- `features/` — contrato Gherkin vendored del legacy.
- `tests/bdd/fixtures.ts` — fixtures y world.
- `tests/bdd/steps/` — definiciones de pasos Playwright-BDD.
- `tests/bdd/legacy-elements/` — mapa de selectores heredado.

## Estado

- Porting funcional en Playwright-BDD para SEO, PDFhint, Users, Dashboard, FirstPayment, TransactionalEmails, Recurrences y Visual.
- `VisualCapture.feature` se mantiene como flujo manual de referencia de snapshots.
- **Última sincronización Gherkin/selectores:** `qai-pa-pdf-editor` (2026-05-29) — `features/Users.feature`, `features/payment/FirstPayment.feature`, `tests/bdd/legacy-elements/` vía `npm run sync:legacy-elements`, paso `I set a random success payment card`, `dismissModalBackdrop` en `editorActions`, config de referencia (`config/suites/`, `cucumber.json`, etc.). Los bundles Playwright en `tests/pages/**/elements.json` no se sobrescriben (formato distinto al legacy).

## Paridad operativa con legacy

| Comando | Uso |
|---------|-----|
| `npm run sync:legacy-elements` | Copia `qai-pa-pdf-editor/src/pages/**/elements.json` → `tests/bdd/legacy-elements/` |
| `npm run porting:tags` | Gate de tags `@PDFEDITOR_*` |

Para detalle de mapeo por feature, ver:

- [docs/TEST_CATALOG_BY_LEGACY_FEATURE.md](TEST_CATALOG_BY_LEGACY_FEATURE.md)
- [docs/SELENIUM_FOLDER_MAP.md](SELENIUM_FOLDER_MAP.md)
