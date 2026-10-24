# Sincronización, fotos y configuración de costos

## Activación en Supabase (una sola vez)

Publicar juntos index.html, navigation.js, cloud-tools.js, live-sync.js y photo-cleanup.js.
En el proyecto Supabase que ya usa la web, abrir SQL Editor y ejecutar **supabase-features.sql**.
El script es idempotente: incorpora user_data a supabase_realtime y agrega las funciones y políticas necesarias para limpiar fotos. No modifica registros de negocio ni crea otra tabla de datos. Conserva las políticas RLS de user_data; deben permitir leer y editar únicamente la fila del usuario autenticado. No desactivar RLS ni publicar claves privadas en la web.

Sin esa activación, el cálculo de costos ya funciona, la web consulta cambios cada 15 segundos como respaldo, y la limpieza indica que falta activarla. Una conexión WebSocket conectada por sí sola no demuestra que la tabla esté incluida en Realtime. Esta configuración no se aplica automáticamente desde el navegador.

## Sincronización

Cada cuenta escucha sus cambios de user_data por Postgres Changes y vuelve a leer su fila al recibir un evento. Se aplican inmediatamente cuando no hay edición ni guardado en curso. También consulta al reconectarse, volver a la pestaña y cada 15 segundos como respaldo. Cierra la suscripción al salir o cambiar de cuenta.

Un formulario abierto se conserva. Se muestra un aviso para ver los cambios de la nube; esa acción pide confirmar antes de descartar el formulario local. Guardar una operación comercial vuelve a comprobar la versión y avisa si otra sesión cambió los datos. Los guardados automáticos combinan cambios independientes en configuración y mantienen las listas como unidades: si ambas sesiones editaron la misma lista o campo, detienen el guardado en vez de elegir silenciosamente una versión. Ver cambios de la nube permite resolver ese bloqueo descartando los cambios locales; copiar lo que se quiera conservar antes de hacerlo.

Recargar las pestañas antiguas antes de editar en dos dispositivos: las versiones anteriores no incluyen estas protecciones.

## Fotos sin uso

Con la web abierta, al entrar, después de operaciones comerciales y cada hora se buscan hasta 100 fotos antiguas sin referencias. Se usa la API de Storage para eliminar también el archivo real, nunca un DELETE directo de storage.objects.

Se conservan todas las referencias photoPath en el JSON completo de la cuenta: productos duplicados, ventas, presupuestos, pedidos e historial. La función obtiene candidatos desde la base; la aplicación vuelve a comprobar las referencias y una política restrictiva de DELETE vuelve a protegerlas en el servidor, incluso si existía otra política permisiva. Solo se admiten rutas de la cuenta autenticada y archivos con más de 24 horas desde su creación. Esa espera protege subidas recientes y operaciones todavía abiertas. Las fotos antiguas que ya no usa ningún registro se limpian en la siguiente revisión. No hay limpieza programada cuando todos los dispositivos tienen la web cerrada.

Un error de permisos o conexión conserva los archivos y reintenta después. Un producto duplicado puede compartir la foto: quitarla de uno solo no elimina la del otro. Si un historial conserva la foto, no es un archivo sin uso y permanece.

## Desgaste y margen de error

Gastos fijos y Calculadora comparten cfg.wear y cfg.err. Se preserva cualquier desgaste explícito anterior (incluido cero). Si no existía, se deriva de repuestos ÷ vida útil. Editar repuestos/vida útil actualiza ese mismo valor; editar costo de impresora mantiene la referencia anterior costo × 1,20 ÷ 3.000. Se puede ajustar manualmente en ambas secciones. Los perfiles antiguos también se normalizan al cargarse.

El costo nuevo es material + electricidad + desgaste + mano de obra + extras + reserva. La reserva es ese subtotal × margen de error / 100. Se muestra por separado antes de aplicar el multiplicador de venta. Poner margen cero reproduce la fórmula anterior. No recalcula productos, presupuestos, pedidos o ventas ya guardados.

## Validación

`node --test --experimental-test-isolation=none finance.test.cjs production-loss.test.cjs cloud-features.test.cjs`

Las pruebas cubren cálculos anteriores, reserva y desgaste, protección de fotos históricas, cambios simultáneos, formularios abiertos, suscripciones por cuenta, guardados y errores de configuración. No sustituyen una prueba del proyecto real: después de ejecutar el SQL, abrir la misma cuenta en dos dispositivos, guardar desde uno y observar el otro sin recargar; repetir con un formulario abierto. Verificar limpieza con una foto antigua sin referencias y otra conservada en una venta, además de una cuenta distinta. El SQL debe ejecutarse en el proyecto para comprobar sus políticas y permisos reales.
