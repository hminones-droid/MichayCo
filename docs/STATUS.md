# Micha & Co — Estado técnico y funcional
Actualizado: 2026-09-26

## Decisiones vigentes
- Producto = presentación física; fragancia = opción/variante.
- Precio comercial pertenece a products.price. No varía por fragancia.
- Stock de productos con fragancia: product_variants (producto × fragancia). Productos sin fragancia: products.stock y SKU de inventario terminado en -NA.
- Categorías son dinámicas y administrables.
- Ocultar es reversible; eliminar es definitivo y siempre requiere confirmación.
- Fotografías reales son la fuente visual; no usar imágenes genéricas de producto.
- Admin prioriza edición rápida web + mantenimiento masivo por Excel.

## Implementado
- Cloudflare Worker/Static Assets + preview corporativa mediante Quick Tunnel/proxy aislado.
- Supabase PostgreSQL/Auth/Storage/RLS.
- Login real y autorización mediante admin_users/is_admin.
- Storefront leyendo productos, variantes e imágenes desde Supabase.
- Bolsa por variante, elección de fragancia y RPC segura de pedidos.
- RPC migrada para calcular totales y snapshots desde products.price.
- Admin: Productos, Categorías, Fragancias, Precios/Stock, Fotos, Pedidos y contraseña.
- Mostrar/ocultar y borrado confirmado.
- Iconografía de eliminación con tachito SVG.
- Fotos: subir, reemplazar, principal y eliminar.
- Precios: edición por producto.
- Stock: edición por producto + fragancia.
- Excel: descarga/subida con hojas Precios y Stock y IDs estables.
- Filtros de mantenimiento.
- Productos sin fragancia administrables, exportados/importados como una sola fila -NA; la tienda omite el selector de aroma.
- Importación Excel con elección de stock total o incremental y confirmación visual. Si una escritura falla, las anteriores pueden persistir: se informa la cantidad aplicada y no se debe reimportar completa una planilla incremental sin revisar el stock.

## P0
1. Probar de punta a punta exportación/importación Excel con datos reales; hacer atómica la aplicación por lote para evitar actualizaciones parciales.
2. Agregar preview de diferencias por fila antes de aplicar importaciones grandes.
3. Cargar fotografías reales y completar composición editorial.
4. Completar editor de Contenido.
5. Probar CRUD/permisos con ambos administradores.
6. Sincronizar supabase/schema.sql con todas las migraciones reales.
7. Retirar product_variants.price tras confirmar cero dependencias.
8. Auditoría automática de cambios admin.

## P1
- Detalle/filtros/exportación de pedidos.
- Drag-and-drop/orden de fotos, productos y categorías.
- Entrega/retiro, contacto, WhatsApp, Instagram/Facebook.
- Estados de falta de stock y UX responsive/accesibilidad.
- Configuración/admin users.

## P2
- Dominio comercial definitivo y URLs Auth.
- Hardening, backups, observabilidad y rate limiting.
- Pruebas integrales.
- Mercado Pago hosted checkout futuro.

## Dominio
No acoplar la app al Quick Tunnel. Rutas internas relativas y redirects basados en location.origin. Al migrar: DNS/Cloudflare, custom domain del Worker, Supabase Site URL/Redirect URLs, HTTPS y pruebas integrales.
