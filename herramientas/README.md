# Herramientas · Emprendimientos 3D

Ocho herramientas de diseño 3D integradas en la página de Emprendimientos. El botón Herramientas aparece junto a Calculadora y abre el taller en otra pestaña.

## Usar

- Web: https://moreamateo.github.io/emprendimientos-3d/herramientas/
- Sin instalar: abrir Herramientas-portatil.html en Chrome o Edge con aceleración gráfica.
- Elegir una herramienta, ajustar parámetros, girar con el mouse y descargar STL, 3MF o ZIP por color/pieza.
- Guardar proyecto conserva los parámetros, imágenes, modelos y fuente cargada en un archivo JSON local; Abrir proyecto los recupera.
- La versión portátil funciona sin conexión salvo la búsqueda de ciudades. Incluye fuentes, catálogo de estrellas y bibliotecas. Las ciudades predefinidas y las coordenadas manuales funcionan sin conexión.

## Herramientas incluidas

1. **Placas patente:** Argentina 1964–1994, 1995–2016 y 2016–actualidad; provincia, inscripción, fuente propia, proporción, relieves, colores y agujero de llavero.
2. **Mapa de estrellas:** fecha/hora local, huso UTC, coordenadas y búsqueda de ciudad; magnitud hasta 6, constelaciones, relieve, uno/dos colores o estrellas caladas, placa rectangular o circular. La dedicatoria se coloca en la placa rectangular.
3. **Mosaico Pixel Art:** imagen, resolución, tamaño de celda, reducción de colores y vista 2D/3D.
4. **Clickers y keycaps:** clicker individual, fila de texto o keycap sola; perfiles, unidades, vástago MX, leyenda en relieve/hundida, base y holguras.
5. **Llavero con imagen:** PNG/JPG/WebP/SVG, recorte, contraste/brillo, fondo, silueta rasterizada por colores, medida total/dibujo, argolla, relieve o plano cara abajo.
6. **Organizador de cajones:** compartimentos, paredes/piso/divisiones, radios, holgura y división automática según la cama.
7. **Cortador STL:** STL/OBJ/3MF, escala, cama XYZ, cortes automáticos y planos editables en milímetros; pernos, espigas, cavidades para imanes o sin encastre. Hasta 12 planos y 64 piezas.
8. **Visor 3D:** importación, rotación/escala, dimensiones, volumen aproximado, peso aproximado y comprobación de cama.

Las otras herramientas de la versión inicial no aparecen en el catálogo.

## Impresión y límites

Unidades en milímetros. El 3MF conserva colores y posiciones en un ensamblaje. Para ZIP por color, importar todos los STL como partes de un mismo objeto. El STL único no guarda colores. Revisar la geometría, unión de cuerpos, orientación y soportes en el laminador antes de imprimir. Los textos y paredes en contacto pueden necesitar la opción de unión de volúmenes del laminador.

Los pesos se calculan por volumen y densidad; no equivalen al consumo final del laminador con paredes, relleno y soportes. Los volúmenes superpuestos pueden contarse más de una vez. Las medidas y holguras MX requieren una prueba con el switch real. El cortador requiere mallas cerradas razonablemente limpias; si no hay espacio sólido para un encastre, reducirlo o elegir Ninguno. Las vistas previas separadas de piezas no son una distribución automática en cama.

La silueta del llavero se obtiene a la resolución elegida; no es un trazado vectorial exacto. La búsqueda de lugares consulta Open-Meteo y exige revisar el UTC de la fecha. El mapa es una representación celeste decorativa basada en coordenadas ecuatoriales, sin refracción ni precesión de precisión astronómica.

## Privacidad

Los modelos, imágenes y fuentes se procesan en el navegador. No se suben a servidores ni se conectan a la cuenta financiera. Solo la búsqueda opcional de ciudad consulta un servicio externo. No hay tokens, pagos ni límites de descarga por cuenta.

## Desarrollo

Requiere Node.js 20 o superior. Ejecutar npm ci, npm test y npm run build dentro de esta carpeta. El sitio usa index.html, app.css y app.js; el archivo portátil es autónomo. El código fuente está en src/. Dependencias y licencias en package-lock.json y licenses/.

## Validación

68 comprobaciones de generación: variantes, tamaños, colores, necesidad de archivos, división de organizadores, conservación de volumen en cortes, encastres y cambio del cielo con UTC. Pruebas de navegador: tres modelos de patente, importación SVG, descarga y reimportación 3MF, estados vacíos y vista adaptable.

Las pruebas existentes de finanzas y pérdidas pasan (14). La suite cloud-features tiene 11 comprobaciones funcionales aprobadas y un fallo preexistente de su lector de archivos al interpretar un sufijo ?v= como parte del nombre. Se verificó por separado la sintaxis de los scripts de la aplicación resolviendo esos sufijos.
