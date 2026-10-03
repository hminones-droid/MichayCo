# Manual de usuario — Catálogo Micha&Co

> Documento vivo. Se completa y valida junto con Catálogo V2 antes de su puesta en producción.

## Principio general
Cargá cada dato una sola vez, en el nivel donde realmente pertenece. El sistema hereda y calcula el resto.

## Insumos
Tipos disponibles:
- **Envase (ENV):** recipiente físico: vaso Volcán, Petaca, frasco plástico.
- **Esencia (ESC):** insumo aromático físico comprado y almacenado.
- **Materia prima (MAT):** cera, alcohol, estabilizador, etc.
- **Accesorio (ACC):** tapa, mecha, portamecha, varillas, aplicadores.
- **Componente (COM):** pieza física relevante del artículo que no es un envase ni consumible; por ejemplo un hornito.
- **Presentación (PRE):** caja, bolsa, etiqueta, cinta y otros elementos de entrega.

El código se genera automáticamente. No inventes códigos manualmente.

### Tipo de insumo vs. rol
El **tipo** pertenece al insumo. El **rol** depende del producto en el que se utiliza.
Por ejemplo, el mismo vaso Volcán puede ser el envase principal de una vela y el recipiente de uso de un difusor cuyo líquido se entrega en otro frasco.

### Productos con varios componentes
Un producto o kit puede incluir más de un envase y más de un componente. Cada relación indica cantidad, rol y, cuando corresponde, qué envase contiene el líquido.

Ejemplo — Difusor Volcán:
- Vaso Volcán: recipiente de uso.
- Frasco plástico: envase de contenido.
- Tapa: accesorio.
- Varillas de bambú: accesorio.
- Alcohol y esencia: consumibles calculados por receta.

Ejemplo — Kit Hornito + 2 aceites:
- Hornito: componente principal.
- Frasco de aceite: 2 unidades, envases de contenido.
- Contenido aromático: según capacidad de cada frasco.
- Caja: presentación.

## Regla para decidir dónde cargar algo
Si se compra, almacena o consume físicamente, normalmente es un insumo.
Si describe cómo se usa ese insumo dentro de un artículo, es un rol del producto.
Si es una fórmula o proporción, pertenece a la receta/composición y no al insumo.

## Pendiente de completar
Este manual incorporará capturas y procedimientos definitivos de Categorías, Insumos, Fragancias, Productos, variantes/SKU, Fotos, Excel, stock, pedidos e integridad antes de producción.
