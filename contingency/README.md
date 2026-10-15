# Micha&Co DEV — contingencia temporal GitHub

Este circuito existe únicamente mientras OpenAI resuelve el refresco del schema v42 de `Micha DEV`.

## Reglas duras

- Único target permitido: `michayco-dev`.
- `michayco` PROD está fuera de alcance.
- GitHub conserva el baseline, los overrides y el build reproducible.
- GitHub Actions ejecuta únicamente `wrangler versions upload`: crea una versión sin asignarle tráfico.
- La promoción continúa desde ChatGPT común mediante `Micha DEV`: `test_version` → `deploy_version` → `verify_dev`.
- Ante cualquier resultado incierto, drift del baseline o fallo de certificación, detenerse y no promover.
- Mientras esta contingencia sea la autoridad de edición, el MCP no se usa para subir source.
- Cuando OpenAI repare v42, reconciliar hashes/source, certificar el canal permanente y retirar esta contingencia y su token temporal.

## Base certificada

`ACTIVE_BASELINE.json` identifica el Worker DEV activo observado al crear la contingencia. `ACTIVE_BASELINE_MANIFEST.json` fija los hashes de sus rutas editables. El constructor descarga cada archivo directamente desde DEV y exige que coincida con ese manifiesto antes de aplicar un override.

## Flujo

1. Crear o modificar únicamente archivos bajo `contingency/overrides/`.
2. Cambiar `RELEASE.txt` a un release DEV nuevo.
3. El builder recupera el resto desde el DEV activo y aborta si detecta drift.
4. Probar el Worker generado localmente.
5. Modificar `upload-trigger.txt` en un commit explícito para disparar GitHub Actions.
6. GitHub Actions crea una versión Cloudflare sin tráfico y deja el Version ID en los logs.
7. Desde ChatGPT común, ejecutar `test_version` contra la versión activa observada.
8. Sólo si certifica, ejecutar `deploy_version` y luego `verify_dev`.
9. Si falla la verificación posterior, ejecutar rollback y verificar restauración.

## Credenciales

El workflow usa únicamente secretos de GitHub Actions. Nunca se guardan tokens en el repositorio. El token Cloudflare de contingencia debe ser temporal y limitado al entorno DEV.
