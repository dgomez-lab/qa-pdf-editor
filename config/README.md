# Configuración Playwright

Esta carpeta conserva dos tipos de configuración:

1. Perfiles que sí carga Playwright (`configuration*.json`).
2. Inventarios vendored del legacy QAI Dogs (`suites/*.json`, `projectSuitesConfiguration.json`, `cucumber.json`) usados como referencia de paridad.

La suite se ejecuta con `npm`; no hay scripts `yarn update:suites` ni dependencias privadas `qai-pa-core` / `qai-pa-pdf-editor-resources` en este paquete.

## Perfil local cargado por Playwright

[`playwright.config.ts`](../playwright.config.ts) llama a [`playwright/loadConfiguration.ts`](../playwright/loadConfiguration.ts) al arrancar:

- Ruta por defecto: `config/configuration.json`.
- Override: `QAI_PA_CONFIGURATION_PATH=config/configuration.pdfhint.json npm test`.
- Si el archivo no existe, el loader devuelve `{}` y Playwright resuelve la URL con variables de entorno y defaults.
- `.env` y `.env.local` son para secrets y flags puntuales; el loader ignora allí las claves propiedad del JSON (`HEADLESS`, `ENVIRONMENT`, `APP`, `BASE_URL`, `BDD_LOG_LEVEL`, `SLOWMO`, etc.).

Campos soportados:

| Campo JSON | Efecto |
|------------|--------|
| `driver.headless` | `true` / `false` -> `HEADLESS=1` / `0` |
| `logLevel` | `DEBUG`, `INFO`, `SILENT` -> `BDD_LOG_LEVEL` |
| `timeouts.stepWaiter` | Segundos legacy -> `SLOWMO` en milisegundos |
| `projectVars.environment` | `red`, `red1` ... `red10` -> host MVPS cuando no hay `baseUrl` |
| `projectVars.baseUrl` | URL fija; cadena vacía elimina `BASE_URL` para volver al host por entorno |
| `projectVars.app` | `mergedpdf` o `pdfhint` -> `APP` |
| `projectVars.appendQaToken` | `false` -> no añadir `x-token-qa` en navegación MVPS |
| `projectVars.emailSubjectBrandPrefix` | Prefijo Mailpit -> `EMAIL_SUBJECT_BRAND_PREFIX` |

`configurationAmazon.json` es un perfil legacy Selenium Grid. No lo uses como perfil Playwright; si lo cargas explícitamente, solo aplican campos compartidos como `driver.headless`, `logLevel` y `timeouts.stepWaiter`. Campos como `driver.type`, `server`, `browser` o `pathDownloads` no los lee Playwright.

## Perfiles habituales

### Stage MVPS (`red`)

`config/configuration.json` ya apunta a `mergedpdf` en `red`:

```json
{
  "driver": { "headless": true },
  "projectVars": {
    "environment": "red",
    "baseUrl": "",
    "app": "mergedpdf"
  }
}
```

Ejecuta:

```bash
npm test
npm run test:tag -- @PDFEDITOR_SEO
```

### Local sandbox

Usa `config/configurationExample.json` como plantilla o cambia temporalmente `configuration.json`:

```json
{
  "driver": { "headless": false },
  "projectVars": {
    "environment": "local",
    "baseUrl": "http://app.sandbox:3000",
    "app": "mergedpdf"
  }
}
```

Ejecuta sin `--headed` si quieres respetar `driver.headless`; `npx playwright test --headed` siempre fuerza navegador visible.

### PDF Hint (`@PDFHINT`)

Los escenarios con tag `@PDFHINT` activan [`tests/helpers/pdfhintScenario.ts`](../tests/helpers/pdfhintScenario.ts) desde hooks BDD: `BASE_URL=https://staging.pdfhint.com`, `APP=pdfhint`, `APPEND_QA_TOKEN=false`, `EMAIL_SUBJECT_BRAND_PREFIX=pdfhint` y `SEO_LOGIN_PATHNAME=/login` si no estaba definido.

Comandos:

```bash
npm run test:pdfhint-smoke
npm run test:pdfhint-tag -- @PDFEDITOR_PDFHINT_SMOKE_SEO
```

## Inventarios legacy de suites

Estos archivos documentan cómo se agrupaban los escenarios en QAI Dogs, pero el workflow Playwright selecciona tests con tags, `--grep` y sharding:

| Archivo | Uso actual |
|---------|------------|
| `projectSuitesConfiguration.json` | Nombres de suites legacy (`allTests`, `paymentTests`, `pdfhintSmoke`) y filtros de referencia. |
| `suites/allTests.json` | Inventario vendored de tags/features para la suite completa legacy. |
| `suites/paymentTests.json` | Inventario vendored de escenarios de pago. |
| `suites/pdfhintSmoke.json` | Inventario vendored del smoke PDF Hint. |
| `cucumber.json` | Config legacy de reportes Cucumber; Playwright-BDD se configura en `playwright.config.ts`. |

Para ejecutar equivalentes Playwright usa los scripts de [`package.json`](../package.json):

```bash
npm run test:ci-regression
npm run test:ci-full
npm run test:pdfhint-smoke
PLAYWRIGHT_PAYMENT_SMOKE=1 npm run test:tag -- @PDFEDITOR_PAYMENT_FIRST_VISA
```

## Pitfalls comunes

- No definas `BASE_URL`, `APP`, `HEADLESS` o `SLOWMO` en `.env`; ponlos en `configuration.json` o pásalos desde el shell/CI.
- Si esperas EUR en pagos dentro de GitHub Actions, confirma `PLAYWRIGHT_DEFAULT_TEST_IP=ES`; los runners públicos suelen salir con IP US.
- Si Mailpit o PDF Hint fallan con 401/403 en CI público, revisa VPN/self-hosted runner en [`docs/GITHUB_REGRESSION.md`](../docs/GITHUB_REGRESSION.md#mailpit-y-vpn-emails-transaccionales).
