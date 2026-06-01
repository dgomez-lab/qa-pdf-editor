# Configuración

`configurationExample.json` shows a local example (`baseUrl`). For Stage, omit `baseUrl` and use `"environment": "red"`.

## App URL (mvps.website)

When `baseUrl` is not set, `ProjectData.getUrl()` maps `environment` to mvps hosts (e.g. `red` → `https://red.mvps.website`, `stage` → `https://red.mvps.website`).

## projectVars

- **environment**: Used to build the app URL when `baseUrl` is omitted (e.g. `"red"`, `"stage"`, `"prod"`).
- **baseUrl** (optional): Overrides the environment-derived URL (e.g. local sandbox).
- **appendQaToken** (optional, boolean, default true): When `false`, `x-token-qa` is not appended to editor URLs.
- **emailSubjectBrandPrefix** (optional, string, default `mergedpdf`): Mailpit subject brand prefix.

## PDF Hint (`@PDFHINT`)

Scenarios tagged `@PDFHINT` (see [`features/PDFhint.feature`](../features/PDFhint.feature)) always use `https://staging.pdfhint.com`, with no QA token and Mailpit prefix `pdfhint`, regardless of `configuration.json` `environment` or `baseUrl`.

Optional `config/configuration.pdfhint.json` only differs by driver settings (e.g. headless); load it with `QAI_PA_CONFIGURATION_PATH=config/configuration.pdfhint.json` if needed.

## PDF Hint smoke suite

- Scenarios: [`features/PDFhint.feature`](../features/PDFhint.feature).
- Generated suite: `config/suites/pdfhintSmoke.json` (after `yarn update:suites`).
- Local run: `yarn test:pdfhint-smoke` or `yarn test:pdfhint-tag @PDFEDITOR_PDFHINT_SMOKE_VISA` (default `configuration.json` is fine).
- Bitbucket: custom pipeline `pdfhint-smoke` in `bitbucket-pipelines.yml`.

## Diagnóstico: pipeline en pdf-editor-monorepo vs este repo

Los **deploys** y la mayoría de jobs de CI suelen definirse en [**pdf-editor-monorepo**](https://bitbucket.org/grupoblidoo/pdf-editor-monorepo), no en el `bitbucket-pipelines.yml` de este proyecto. Aquí solo está el pipeline *custom* **pdfhint-smoke** (smoke Cucumber contra staging pdfhint).

Este paquete declara dependencias privadas por **git+ssh** (`qai-pa-pdf-editor-resources`, `qai-pa-core` en `package.json`). Cualquier paso que ejecute `yarn install` en Pipelines necesita **clave SSH** (y `known_hosts` para Bitbucket) configurada en el monorepo o en el step; si no, verás errores tipo `Permission denied (publickey)`.

### Si un build/deploy falla en Bitbucket

1. Abre el **paso** que falló y anota su **nombre** (Build, Deploy, Test, etc.).
2. Copia del log **desde la primera línea ERROR / en rojo** unas 30–50 líneas (el ancla `#line=5-1` en la URL suele ser una línea del **log**, no del YAML).

### Paso del pipeline → causas frecuentes

| Tipo de paso / mensaje en el log | Causa típica |
|-----------------------------------|--------------|
| Checkout / submodules | Permisos SSH, submodules mal configurados |
| `yarn install` / `npm ci` | SSH a repos `grupoblidoo/*`, token/registry, lockfile |
| `corepack` / comando `yarn` no encontrado | Imagen Node distinta; falta `corepack enable` o Yarn 4 según `packageManager` |
| Tests / Cucumber / smoke | `@PDFHINT` / mergedpdf hosts, network to env, timeouts, tags |
| Docker push / deploy (K8s, helm, etc.) | Credenciales del registry, permisos, variables de entorno del step |
| `vercel whoami` / `Not authorized` / scope `…-projects` | El `VERCEL_TOKEN` en Bitbucket no tiene acceso al **team** de Vercel del proyecto; regenerar token con acceso a ese team y alinear `VERCEL_ORG_ID` |

## Diagnóstico: pipeline en pdf-editor-monorepo vs este repo

Los **deploys** y la mayoría de jobs de CI suelen definirse en [**pdf-editor-monorepo**](https://bitbucket.org/grupoblidoo/pdf-editor-monorepo), no en el `bitbucket-pipelines.yml` de este proyecto. Aquí solo está el pipeline *custom* **pdfhint-smoke** (smoke Cucumber contra staging pdfhint).

Este paquete declara dependencias privadas por **git+ssh** (`qai-pa-pdf-editor-resources`, `qai-pa-core` en `package.json`). Cualquier paso que ejecute `yarn install` en Pipelines necesita **clave SSH** (y `known_hosts` para Bitbucket) configurada en el monorepo o en el step; si no, verás errores tipo `Permission denied (publickey)`.

### Si un build/deploy falla en Bitbucket

1. Abre el **paso** que falló y anota su **nombre** (Build, Deploy, Test, etc.).
2. Copia del log **desde la primera línea ERROR / en rojo** unas 30–50 líneas (el ancla `#line=5-1` en la URL suele ser una línea del **log**, no del YAML).

### Paso del pipeline → causas frecuentes

| Tipo de paso / mensaje en el log | Causa típica |
|-----------------------------------|--------------|
| Checkout / submodules | Permisos SSH, submodules mal configurados |
| `yarn install` / `npm ci` | SSH a repos `grupoblidoo/*`, token/registry, lockfile |
| `corepack` / comando `yarn` no encontrado | Imagen Node distinta; falta `corepack enable` o Yarn 4 según `packageManager` |
| Tests / Cucumber / smoke | `QAI_PA_CONFIGURATION_PATH`, red hacia el entorno, timeouts, tags |
| Docker push / deploy (K8s, helm, etc.) | Credenciales del registry, permisos, variables de entorno del step |
| `vercel whoami` / `Not authorized` / scope `…-projects` | El `VERCEL_TOKEN` en Bitbucket no tiene acceso al **team** de Vercel del proyecto; regenerar token con acceso a ese team y alinear `VERCEL_ORG_ID` |

### Ejecutar tests contra local

En `configuration.json`:

```json
"projectVars": {
  "environment": "local",
  "baseUrl": "http://app.sandbox:3000"
}
```

### Ejecutar tests contra Stage

Quita `baseUrl` o no lo definas y usa:

```json
"projectVars": {
  "environment": "red"
}
```
