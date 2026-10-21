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

Publicar juntos `index.html`, `orders.js`, `orders.css`, `sales-edit.js` y `commerce-maintenance.js`.

## Corregir ventas

En **Ventas → Editar venta**, corregí cliente, fecha, detalle, productos, cantidades, precios y costos. Podés agregar productos del catálogo o ítems manuales y quitar ítems equivocados. **Guardar cambios de venta** actualiza el registro existente y recalcula total, costo y ganancia; no crea otra venta. Si desconocés un costo, dejalo vacío.

La edición conserva fotos, campos históricos y vínculos con pedidos y presupuestos. Estos últimos mantienen sus datos originales. Los cambios se reflejan en las estadísticas de ventas. Si falla el guardado, el formulario conserva las correcciones para reintentar; ante un conflicto con otra sesión, recargá.

## Presupuestos vendidos y eliminación

Al abrir **Ventas**, se importan los presupuestos con estado **Vendido** que todavía no tienen venta. Se conserva cliente, fecha, productos, cantidades e importe. Los pendientes no se importan.

Las ventas de versiones antiguas se vinculan por detalle, fecha, cantidad e importe cuando existe una sola coincidencia; se completa el cliente faltante sin crear otra venta ni modificar su costo histórico. Si hay varias coincidencias, aparece un selector para elegir la venta correcta. Los datos de una venta ya vinculada no se sobrescriben al volver a abrir Ventas.

**Eliminar venta** pide confirmación y actualiza el balance. El presupuesto vinculado vuelve a **Pendiente** y el pedido se conserva con su estado e importes, sin el vínculo a la venta eliminada. La venta no se reimporta automáticamente; podés registrarla otra vez explícitamente desde el presupuesto o pedido si corresponde.

## Kilos de stock

En **Stock → Modificar kilos**, ingresá los kilos restantes de ese material (por ejemplo, `0,750` para 750 g) y, si hace falta, su capacidad total. Se admite cero para un material agotado. El restante no puede superar la capacidad. El guardado conserva los demás datos del material y admite registros antiguos en kg y actuales en gramos, incluyendo Otros materiales.
