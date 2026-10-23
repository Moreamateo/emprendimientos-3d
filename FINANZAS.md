# Ventas, resultado y banco

No requiere SQL ni migraciones de tablas. Se conserva `user_data.data` de Supabase y su política de acceso actual. Se agregan propiedades opcionales a los registros y `stockMovements` al documento JSON. No se borran ni se reemplazan ventas históricas. La inicialización de la nueva lista es idempotente; no escribe datos hasta guardar una acción. Las operaciones de comercio mantienen la comprobación de versión (`updated_at`) y guardan pago y alta de stock en una sola actualización.

## Puesta en marcha

1. Publicar los archivos de este commit juntos. Recargar las pestañas antiguas antes de editar; una versión anterior de la página no conoce los nuevos campos.
2. En Estadísticas → Conciliar registros existentes, clasificar las ventas transferidas como Banco. Clasificar los AR$38.000 existentes como Préstamo recibido, los AR$67.500 como Compra de stock y los AR$10,15 como Rendimiento bancario. No volver a cargar esos importes si ya existen.
3. Para la regla de AR$3.000: si existe como venta, elegir Compensación de deuda. Si existe en ingresos extra, elegir Trabajo que cancela deuda. Usar solo uno de esos registros, nunca ambos. Si todavía no existe, crear una venta por el trabajo con ese medio de cobro. Completar su costo cuando se conozca.
4. Completar el costo de la venta de AR$6.000. Hasta entonces el resultado seguirá provisional. Revisar todos los registros sin clasificar; no se presume que una venta antigua fue transferida.
5. Para compras nuevas, Stock permite registrar el alta y su pago juntos. Para filamentos cuyo pago ya figura en Gastos, elegir Stock existente / pago ya registrado. El precio es el importe total pagado por ese rollo, no precio por kg. Los ajustes de peso no crean pagos ni costos nuevos: se conserva un historial de movimientos. El costo consumido debe estar en la venta, incluidos desperdicios si corresponden; no se descuenta otra vez al ajustar el peso.

## Conciliación de referencia

Banco: 57.800 + 38.000 − 67.500 + 10,15 = **28.310,15**. Deuda: 38.000 − 3.000 = **35.000**. La compensación no entra ni sale del banco.

El margen provisional sobre las ventas transferidas es 57.800 − 22.312,58 = **35.487,42**, con AR$6.000 vendidos sin costo. Al sumar el rendimiento, el resultado de esos registros es **35.497,57**. Ninguno representa efectivo disponible.

Si los AR$3.000 de la regla son una venta adicional a los AR$57.800, el total vendido pasa a AR$60.800 y también se incorpora su costo al resultado. No se fuerza el resultado a AR$35.487,42 agregando un ajuste artificial. Si la regla no tiene costo cargado, también queda pendiente. Los importes de referencia son casos de prueba, no datos precargados en la cuenta.

## Validación

Ejecutar `node --test finance.test.cjs`. Cubre conciliación en centavos, compensaciones, préstamos, capital, inventario, gastos incluidos, costos faltantes, efectivo, ventas pendientes, reclasificación y conservación de datos antiguos.

El saldo es calculado desde el historial, no una conexión bancaria. Puede registrarse un saldo inicial cuando el historial comienza con dinero previo; no usarlo para ocultar diferencias. Deuda es el principal neto registrado (sin desagregación por acreedor). No se aplicaron cambios directamente a la base de producción.

## Pérdida de producción

En **Gastos e ingresos → Nuevo gasto → Tipo de movimiento → Pérdida de producción**, ingresá el concepto, fecha e importe del costo perdido. No requiere material ni gramos y funciona aunque no haya stock cargado. Se descuenta de la ganancia y del resultado del mes sin mover banco, efectivo o deuda, ni generar compras o ajustes de stock.

La aclaración del formulario es: “La pérdida descuenta el importe de la ganancia, sin mover banco ni efectivo. El importe es el costo perdido, no el precio de venta. No lo incluyas otra vez en el costo de una venta. Si ya ajustaste el peso, marcá la opción para evitar otro descuento.”

La casilla **Ya ajusté el peso del stock** es una constancia opcional del ajuste manual. Marcada o no, las pérdidas nuevas no modifican cantidades. Editar o eliminar una pérdida por importe tampoco crea movimientos de stock.

Compatibilidad: las pérdidas antiguas con material conservan sus datos y descuentos previos. Editar únicamente su importe no vuelve a descontar stock. Si se elimina o reclasifica una pérdida antigua que había descontado material automáticamente, se revierte su movimiento original; esta condición se indica en la confirmación de eliminación. Los ajustes manuales previos no se revierten.

Publicar también production-loss.js. No requiere migración SQL. Pruebas: node --test finance.test.cjs production-loss.test.cjs.
