# Gestión de pedidos

En el menú **Pedidos**, elegí **Nuevo pedido**. Completá cliente y fechas, agregá uno o varios productos del catálogo y ajustá cantidades y precios acordados. Podés importar un presupuesto, registrar una seña o el total pagado y escribir observaciones. Los importes son ARS.

Los pedidos anteriores se cargan con su fecha original y estado actual. No se eliminan al entregar o cancelar. La búsqueda encuentra clientes y productos; los filtros y el orden por fecha permiten revisar pendientes e históricos.

Cada tarjeta permite ver detalles, editar y cambiar estado. **Marcar entregado** solamente cambia el pedido. **Registrar venta cobrada** aparece para pedidos entregados y se habilita al completar el pago. Requiere confirmación; la relación entre pedido, presupuesto y venta impide repetir la conversión. Si una venta ya se cargó manualmente sin vínculo, no vuelvas a registrarla desde el pedido. Los pedidos y señas no afectan por sí solos las estadísticas de ventas.

Después de registrar la venta, se bloquean productos e importes del pedido para conservar el comprobante. Se pueden editar cliente, notas, fechas y estado; esas ediciones no modifican la venta histórica.

## Persistencia

Se agrega `orders` al objeto de datos existente en `user_data`, sin migración SQL. Usa la sesión autenticada y filtros por usuario, ID de fila y `updated_at`; el JSON viaja únicamente en el cuerpo PATCH. Los rechazos de permisos y cambios concurrentes no se confirman como guardados. Ante conflicto, recargá antes de reintentar.

Las fotos usan las referencias de Storage y URLs firmadas existentes; no se copian imágenes en el JSON ni se borran archivos. Se mantienen instantáneas de nombres, cantidades, precios y costos para que posteriores ediciones del catálogo no alteren pedidos anteriores.

## Comprobaciones realizadas

- Sintaxis del JavaScript y pruebas de navegador con Supabase simulado: creación, edición, estados, importación de presupuesto, búsqueda, filtros, persistencia al recargar, pedidos históricos, ventas sin duplicación, errores y conflictos.
- Regresión de Productos, Ventas y Presupuestos, incluyendo fotos y comprobantes PDF.
- SDK real de Supabase con transporte simulado: cuerpo PATCH, URL corta, filtros de usuario y timestamp, denegación RLS y preservación de otros datos.
- Diseño móvil de 390 px y escritorio. No se realizaron escrituras de prueba en una cuenta real.

Publicar juntos `index.html`, `navigation.js`, `orders.js`, `orders.css`, `sales-edit.js`, `commerce-maintenance.js` y `expenses.js`.

## Corregir ventas

En **Ventas → Editar venta**, corregí cliente, fecha, detalle, productos, cantidades, precios y costos. Podés agregar productos del catálogo o ítems manuales y quitar ítems equivocados. **Guardar cambios de venta** actualiza el registro existente y recalcula total, costo y ganancia; no crea otra venta. Si desconocés un costo, dejalo vacío.

La edición conserva fotos, campos históricos y vínculos con pedidos y presupuestos. Estos últimos mantienen sus datos originales. Los cambios se reflejan en las estadísticas de ventas. Si falla el guardado, el formulario conserva las correcciones para reintentar; ante un conflicto con otra sesión, recargá.

## Presupuestos vendidos y eliminación

Al abrir **Ventas**, se importan los presupuestos con estado **Vendido** que todavía no tienen venta. Se conserva cliente, fecha, productos, cantidades e importe. Los pendientes no se importan.

Las ventas de versiones antiguas se vinculan por detalle, fecha, cantidad e importe cuando existe una sola coincidencia; se completa el cliente faltante sin crear otra venta ni modificar su costo histórico. Si hay varias coincidencias, aparece un selector para elegir la venta correcta. Los datos de una venta ya vinculada no se sobrescriben al volver a abrir Ventas.

**Eliminar venta** pide confirmación y actualiza el balance. El presupuesto vinculado vuelve a **Pendiente** y el pedido se conserva con su estado e importes, sin el vínculo a la venta eliminada. La venta no se reimporta automáticamente; podés registrarla otra vez explícitamente desde el presupuesto o pedido si corresponde.

## Kilos de stock

En **Stock → Modificar kilos**, ingresá los kilos restantes de ese material (por ejemplo, `0,750` para 750 g) y, si hace falta, su capacidad total. Se admite cero para un material agotado. El restante no puede superar la capacidad. El guardado conserva los demás datos del material y admite registros antiguos en kg y actuales en gramos, incluyendo Otros materiales.

## Páginas y actualización sin reiniciar

Cada apartado tiene su propia dirección: `#/calculadora`, `#/gastos-fijos`, `#/presupuestos`, `#/productos`, `#/pedidos`, `#/stock`, `#/ventas` y `#/estadisticas`. Se pueden guardar como favoritos, abrir en otra pestaña y usar con Atrás/Adelante. Al recargar o iniciar sesión desde un enlace, se conserva el apartado indicado en la dirección. Las rutas funcionan en hosting estático sin configurar redirecciones.

El menú cambia de página sin volver a descargar toda la aplicación. Antes de traer los datos recientes se terminan los guardados pendientes. El botón **Actualizar datos** vuelve a consultar la cuenta y actualiza el apartado actual, sin recargar el navegador. Si falla la lectura, se conservan los datos que ya estaban cargados y se muestra el error. Este botón recarga datos guardados; no guarda formularios que todavía no enviaste.

Los guardados de ventas, pedidos, productos y stock actualizan su vista al confirmarse; no hace falta recargar. La dirección del apartado no añade registros a Supabase ni guarda datos privados en la URL.

## Gastos y estadísticas

**Gastos** (`#/gastos`) registra pagos realizados: concepto, fecha, importe en ARS, categoría, proveedor y observaciones. Permite editar, eliminar con confirmación y filtrar por texto, mes o categoría. Usa `D.expenses` en la misma fila de `user_data`, con el guardado autenticado y control de cambios concurrentes existentes; no requiere migraciones.

**Gastos fijos** conserva su configuración y uso en la calculadora. No genera pagos automáticamente. Tampoco se modifican existencias al cargar un gasto.

Estadísticas calcula **ingresos de ventas − costos de ventas − gastos adicionales**. Muestra por separado esos importes y el resultado de todos los registros; el gráfico y detalle mensual abarcan los últimos seis meses. Si falta el costo de alguna venta, el resultado se indica como provisional. Se retiró completamente el valor estimado del stock de esta pantalla y sus cálculos.

Si un pago ya está incluido en los costos de ventas, marcá **Ya incluido en el costo de ventas**. Queda en el historial de gastos y en el total pagado registrado, pero no se descuenta otra vez del resultado ni del gráfico. Esta clasificación es manual: el sistema no adivina qué compras o servicios están incluidos en los costos de tus productos.

Se conservan los ingresos extra incorporados en la versión anterior: crear, editar y eliminar desde Gastos e ingresos. Se suman a ventas en los ingresos totales y en el mes correspondiente, sin duplicarse como ventas. Los gastos con campo histórico name se reconocen al editar y buscar.
