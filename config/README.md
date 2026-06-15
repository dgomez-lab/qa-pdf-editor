# Configuración local

El runner carga configuración desde [`playwright/loadConfiguration.ts`](../playwright/loadConfiguration.ts) antes de resolver la URL base. Por defecto lee `config/configuration.json`; para usar otro archivo exporta `QAI_PA_CONFIGURATION_PATH`.

```bash
npm run test:tag -- @PDFEDITOR_SEO
QAI_PA_CONFIGURATION_PATH=config/configurationExample.json npm run test:tag -- @PDFEDITOR_SEO
```

## Archivos activos

| Archivo | Uso |
|---------|-----|
| `configuration.json` | Perfil local por defecto: `mergedpdf`, `red`, navegador headless. |
| `configurationExample.json` | Ejemplo editable para sandbox/local (`baseUrl`) y navegador visible. |
| `configuration.pdfhint.json` | Perfil opcional para comandos PDFhint; los hooks `@PDFHINT` fijan staging aunque no uses este archivo. |
| `configurationAmazon.json` | Referencia de configuración heredada para entornos AWS/Dogs. |
| `suites/*.json`, `projectSuitesConfiguration.json`, `cucumber.json` | Inventario legacy conservado para paridad; Playwright-BDD ejecuta desde `features/**/*.feature`, no desde estos JSON. |

## Campos soportados

| Campo JSON | Efecto |
|------------|--------|
| `driver.headless` | Define `HEADLESS=1` o `0`. `npx playwright test --headed` siempre tiene prioridad visual. |
| `logLevel` | Define `BDD_LOG_LEVEL` (`DEBUG`, `INFO`, `SILENT`). |
| `timeouts.stepWaiter` | Define `SLOWMO` en milisegundos (`stepWaiter` está en segundos). |
| `projectVars.environment` | Define `ENVIRONMENT`; `red`, `red1`... resuelven hosts `mvps.website` cuando no hay `baseUrl`. |
| `projectVars.baseUrl` | Define `BASE_URL`; si existe pero está vacío, limpia `BASE_URL` para volver a resolver por entorno. |
| `projectVars.app` | Define `APP` (`mergedpdf` o `pdfhint`). Si solo hay `environment`, el runner asume `mergedpdf`. |
| `projectVars.appendQaToken` | `false` define `APPEND_QA_TOKEN=false`; `true` vuelve al comportamiento por defecto. |
| `projectVars.emailSubjectBrandPrefix` | Define `EMAIL_SUBJECT_BRAND_PREFIX` para búsquedas Mailpit. |

`.env` queda para secretos y flags puntuales (`PLAYWRIGHT_CRM_USER`, Mailpit, `PLAYWRIGHT_PAYMENT_SMOKE`, etc.). No lo uses para `BASE_URL`, `APP`, `HEADLESS` o `ENVIRONMENT`; esos valores se toman del JSON para mantener paridad con `qai-pa-pdf-editor`.

## MergedPDF / MVPS

Para Stage, deja `baseUrl` vacío u omítelo y usa `environment: "red"`:

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

La URL final se resuelve en [`playwright/resolveBaseUrl.ts`](../playwright/resolveBaseUrl.ts). En hosts `*.mvps.website`, el token QA se añade por navegación desde [`tests/helpers/mvpsUrl.ts`](../tests/helpers/mvpsUrl.ts); no lo pegues como parte permanente del `baseUrl` salvo que estés probando la normalización.

## PDFhint (`@PDFHINT`)

Los escenarios con tag `@PDFHINT` activan [`tests/helpers/pdfhintScenario.ts`](../tests/helpers/pdfhintScenario.ts) desde hooks BDD:

- `BASE_URL=https://staging.pdfhint.com`
- `APP=pdfhint`
- `APPEND_QA_TOKEN=false`
- `EMAIL_SUBJECT_BRAND_PREFIX=pdfhint`
- `SEO_LOGIN_PATHNAME=/login` si no estaba definido

Comandos útiles:

```bash
npm run test:pdfhint-smoke
npm run test:pdfhint-tag -- @PDFEDITOR_PDFHINT_SMOKE_VISA
QAI_PA_CONFIGURATION_PATH=config/configuration.pdfhint.json npm run test:tag -- @PDFEDITOR_PDFHINT_SMOKE_SEO
```

PDFhint y Mailpit suelen requerir VPN corporativa. En GitHub Actions, consulta [`docs/GITHUB_REGRESSION.md`](../docs/GITHUB_REGRESSION.md#mailpit-y-vpn-emails-transaccionales) para runner self-hosted o diagnóstico de `HTTP 401/403`.

## Sandbox o local

Para apuntar a una instancia local, define `baseUrl` y conserva `app`:

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

Ejecuta un tag pequeño primero:

```bash
npm run test:tag -- @PDFEDITOR_SEO
```

## Diagnóstico rápido

| Síntoma | Revisión |
|---------|----------|
| Se abre Chrome aunque `headless` es `true` | Quita `--headed`; ese flag tiene prioridad sobre el JSON. |
| MVPS muestra página pública o 404 | Revisa `QAI_TOKEN_PARAM` y que `APPEND_QA_TOKEN` no esté en `false` para `mergedpdf`. |
| PDFhint usa URL MVPS | Añade tag `@PDFHINT` al escenario o ejecuta con `npm run test:pdfhint-*`. |
| Precios USD / campo ZIP en CI | En regresión, `PLAYWRIGHT_DEFAULT_TEST_IP=ES`; en local añade `ip` en los datos del escenario si necesitas otro país. |
| Cambiaste `.feature` y no aparece el test | Ejecuta `npm run bddgen`; `.features-gen/` es generado y está gitignored. |
