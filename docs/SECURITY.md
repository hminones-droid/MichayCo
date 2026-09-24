# Micha & Co — arquitectura y seguridad

## Flujo objetivo
Cliente → dominio comercial → Cloudflare Worker/Static Assets → Supabase (PostgreSQL/Auth/Storage).

GitHub es actualmente repositorio/versionado y disparador de despliegue; no es requisito de ejecución de la tienda.

## Reglas
- No guardar tarjetas, CVV ni credenciales financieras.
- No guardar service_role, API tokens ni contraseñas en este repositorio.
- Admin real mediante Supabase Auth; eliminar el login demo antes de producción.
- RLS habilitado en todas las tablas expuestas.
- Fotos de producto en Supabase Storage; sólo rutas públicas/firmadas en frontend.
- Validar tipo/tamaño/nombre de uploads.
- Registrar cambios administrativos relevantes en audit_log.
- Pago informado no equivale a pago confirmado.
- Mercado Pago futuro mediante checkout alojado por proveedor.

## Despliegue
Cloudflare Workers + Static Assets. workers.dev sólo para prueba. Producción deberá usar dominio comercial propio con HTTPS.
