# Micha & Co — Catálogo administrativo V2

## Principio
Complejidad debajo, simplicidad para el usuario. Un dato se carga una sola vez en el nivel más alto donde es válido y se hereda hacia abajo.

## Reglas transversales
- Administración responsive desde el origen: desktop, tablet y celular.
- Tienda cliente desktop es baseline visual aprobada: los cambios de arquitectura no deben alterar su apariencia ni comportamiento sin aprobación explícita.
- Catálogos relacionados permiten crear/editar dependencias en contexto y volver al formulario de origen sin perder datos.
- Excel: exportación completa; importación con IDs estables, validación, diferencias y confirmación. Ausencia de una fila nunca implica borrado.
- Multimedia reutilizable: múltiples imágenes, principal, orden, encuadre y herencia.
- Integridad separa configuración, disponibilidad de stock y visibilidad comercial.
- Durante migración puede existir compatibilidad legacy interna; al cierre no deben quedar menús, campos ni caminos obsoletos visibles.

## Modelo objetivo
Categoría → reglas comunes de fabricación → Producto → Variante física/envase → SKU vendible.
Fragancia es transversal y se formula con Esencias.
Insumos unificados por tipo: ENV, ESC, MAT, ACC, COM, PRE.
Envases agregan atributos físicos estructurados (material, color, capacidad y dimensiones).
SKU final combina identidad comercial/variante física con fragancia; el usuario no construye combinaciones manualmente.

## Compatibilidad
La tienda actual continúa recibiendo los campos que espera mientras el backoffice migra al modelo nuevo. Los campos legacy sólo se retiran cuando no tengan consumidores.

## Primer incremento
Categorías V2 usa el patrón compacto común: búsqueda, estado, métricas calculadas, visibilidad, acciones y edición responsive. La ficha expone sólo datos comerciales; el código queda en opciones técnicas para preservar los SKU existentes.

## Insumos y composición física
El tipo del insumo es estable; el rol se define en cada relación con un producto. Un producto puede tener múltiples envases y componentes. La relación Producto → Insumo guarda rol, cantidad o regla de cantidad y, cuando corresponde, el envase concreto que recibe un contenido. Esto cubre kits y artículos como Difusor Volcán sin forzar que todo sea un único envase principal.

El monitor de Insumos separa stock, uso, costo unitario derivado, estado de reposición y visibilidad del catálogo. Stock bajo mínimo y sin stock son estados operativos, no equivalen a ocultar el insumo.
