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

Publicar juntos `index.html`, `orders.js` y `orders.css`.
