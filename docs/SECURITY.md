# Micha & Co — Arquitectura y seguridad
Actualizado: 2026-09-25

## Flujo
Cliente/Admin → dominio → Cloudflare Worker/Static Assets → Supabase PostgreSQL/Auth/Storage.

## Autenticación administrativa
- Supabase Auth real.
- Autorización explícita con public.admin_users e is_admin().
- is_admin() restringida a authenticated.
- No exponer contenido administrativo antes de validar sesión/autorización.
- No almacenar contraseñas, service_role ni secretos en repositorio/frontend.

## Pedidos
create_guest_order es SECURITY DEFINER y permanece invocable por clientes invitados por diseño. Debe validar íntegramente nombre/teléfono, cantidad, publicación, precio y stock del lado servidor.
Desde la migración use_product_price_for_orders, el precio confiable se toma de products.price; el navegador y product_variants.price no son fuente de verdad.

## Storage
Bucket product-images; tipos JPG/PNG/WebP; máximo 5 MB. Lectura pública según políticas vigentes; escritura/borrado reservados a administración autorizada. Reemplazos deben subir el nuevo archivo antes de eliminar el anterior.

## RLS y mínimo privilegio
RLS obligatorio en tablas expuestas. CRUD administrativo requiere autorización explícita. Revisar políticas después de cada cambio de esquema y ejecutar asesores de seguridad.

## Importación Excel
Los IDs de producto/variante son claves de actualización. Antes de producción, agregar validación previa, límites de tamaño/filas, rechazo de IDs desconocidos/duplicados, resumen de cambios y estrategia transaccional para evitar importaciones parciales.

## Producción
HTTPS, dominio propio, URLs Auth autorizadas, rate limiting, backups, observabilidad, auditoría de cambios y pruebas de permisos. Pago futuro mediante checkout alojado; nunca almacenar tarjeta/CVV.


## Inventario y checkout (2026-09-26)
- create_guest_order valida stock dentro de la base y bloquea las filas relevantes durante la transacción para evitar vender por encima del stock disponible.
- El stock se descuenta únicamente al confirmar correctamente el pedido.
- Productos con fragancia se validan/descuentan en product_variants.
- Productos sin fragancia se validan/descuentan en products.stock y el pedido admite variant_id nulo.
- El precio confiable continúa siendo products.price; el cliente no envía un precio aceptado por el servidor.
- Nunca confiar en disponibilidad, cantidad ni precio calculados solamente en JavaScript.
