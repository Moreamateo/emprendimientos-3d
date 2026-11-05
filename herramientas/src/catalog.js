const num=(key,label,value,min,max,step=.1)=>({key,label,value,min,max,step,type:'number'});
const text=(key,label,value='',maxLength=100)=>({key,label,value,maxLength,type:'text'});
const tabs=(key,label,value,options)=>({key,label,value,options,type:'tabs'});
const check=(key,label,value=true)=>({key,label,value,type:'checkbox'});
const color=(key,label,value)=>({key,label,value,type:'color'});
const select=(...args)=>({...tabs(...args),type:'select'});
const group=(title,...fields)=>({title,fields});
export const cities=[['Buenos Aires',-34.6037,-58.3816,-3],['Córdoba',-31.4201,-64.1888,-3],['Rosario',-32.9442,-60.6505,-3],['Mendoza',-32.8895,-68.8458,-3],['La Plata',-34.9215,-57.9545,-3],['Mar del Plata',-38.0055,-57.5426,-3],['Montevideo',-34.9011,-56.1645,-3],['Santiago',-33.4489,-70.6693,-3],['Madrid',40.4168,-3.7038,1],['Ciudad de México',19.4326,-99.1332,-6]];
export const tools=[
{id:'plate',title:'Placas patente',icon:'▤',description:'Escribí la patente y bajá la placa lista para imprimir, como llavero o a escala, en uno o varios colores.',groups:[
 group('Modelo de placa',select('model','Modelo','2016',['1964|Argentina — 1964–1994','1995|Argentina — 1995–2016','2016|Argentina — 2016–actualidad'])),
 group('Texto',text('province','Provincia (borde izquierdo)','B1',3),text('heading','Texto de arriba','REPUBLICA ARGENTINA',35),text('number','Números de la patente','AB 123 CD',9),num('charWidth','Ancho de los caracteres · %',100,50,150,1),{key:'fontUpload',type:'font',label:'Usar mi propia tipografía'}),
 group('Tamaño',{type:'presets',key:'sizes',options:['70|Llavero · 70 mm','150|Chica · 150 mm','300|Grande · 300 mm']},num('width','Ancho · mm',100,30,500),num('height','Alto · mm',31.8,12,250),check('proportion','Mantener proporción')),
 group('Grosores y relieve',num('thickness','Grosor de la placa · mm',2,.6,10),num('relief','Alto del relieve · mm',.8,.2,4),num('titleHeight','Altura del texto de arriba · mm',.4,.2,3),num('stripeHeight','Altura de la franja azul · mm',.4,.2,3),num('borderHeight','Altura del marco · mm',.8,.2,4),check('rounded','Puntas redondeadas')),
 group('Llavero',check('loop','Agujero para llavero',false)),
 group('Colores',color('baseColor','Color de la placa','#f5f5f3'),color('borderColor','Color del marco','#151515'),color('stripeColor','Color de la franja','#3455b4'),color('titleColor','Color del texto de arriba','#ffffff'),color('textColor','Color de los caracteres','#151515'))]},
{id:'stars',title:'Mapa de estrellas',icon:'✧',description:'Elegí el lugar, la fecha y la hora: se dibuja el cielo que se veía desde ahí, para regalar o guardar de recuerdo.',groups:[
 group('Cielo',{type:'city',key:'citySearch'},select('city','Ciudad','Buenos Aires',cities.map(c=>c[0])),num('lat','Latitud · °',-34.6037,-90,90,.0001),num('lon','Longitud · °',-58.3816,-180,180,.0001),{...text('date','Fecha','2026-11-05'),type:'date'},{...text('time','Hora local','21:00'),type:'time'},num('utc','Huso horario · h',-3,-12,14,.5),num('magnitude','Brillo mínimo (magnitud)',5,1,6,.1),num('starSize','Tamaño de las estrellas · ×',1,.3,3,.1),check('lines','Líneas de las constelaciones'),num('lineWidth','Grosor de las líneas · mm',.8,.3,2,.1)),
 group('Pieza',tabs('mode','Colores','two',['two|2 colores','one|1 color','holes|Calado']),tabs('shape','Forma','rect',['rect|Rectángulo','circle|Círculo']),num('width','Ancho · mm',160,60,350),num('height','Alto · mm',215,80,450),num('thickness','Grosor de placa · mm',2,.6,8),num('relief','Alto del relieve · mm',.8,.2,3),num('border','Ancho del borde · mm',3,1,10)),
 group('Texto',text('title','Título','Nuestra primera noche',60),text('subtitle','Lugar / dedicatoria','Buenos Aires, Argentina',70),check('details','Mostrar fecha y coordenadas'),select('font','Fuente','script',['script|Pacifico','sans|Sans serif']),num('textSize','Tamaño del título · mm',9,3,20)),
 group('Colores',color('baseColor','Color de la placa','#3d455f'),color('detailColor','Color de estrellas y texto','#fff7e8'))]},
{id:'pixel',title:'Mosaico Pixel Art',icon:'▦',description:'Cargá una foto o dibujo y convertilo en una placa de pixel art 3D por colores.',upload:'image',groups:[group('Imagen y grilla',{type:'image',key:'upload'},num('resolution','Ancho de la grilla · px',32,8,128,1),num('cell','Tamaño de celda · mm',4,.5,10),num('thickness','Grosor de la placa · mm',2,.6,8),num('relief','Alto de los píxeles · mm',.8,.2,4),num('colors','Colores',6,2,16,1),check('keepRatio','Mantener proporción de la imagen')),group('Colores',color('baseColor','Color de la base','#eeeeee'))]},
{id:'keycap',title:'Clickers y keycaps',icon:'⌨',description:'Creá un clicker, una fila de teclas con tu nombre o una keycap personalizada.',groups:[
 group('Qué querés armar',tabs('mode','Pieza','clicker',['clicker|Clicker (1 tecla + base)','row|Fila de teclas (un nombre)','keycap|Solo keycap'])),
 group('Leyenda',select('icon','Icono','text',['text|Sin icono (usar el texto)','heart|Corazón','star|Estrella','plus|Cruz']),text('text','Texto','A',14),select('font','Fuente','script',['script|Pacifico','sans|Sans serif','condensed|Anton']),tabs('legend','Estilo de la leyenda','raised',['raised|En relieve','inset|Hundida']),num('textSize','Alto de las letras o del icono · mm',6,2,14),num('relief','Profundidad / alto del relieve · mm',.6,.2,2)),
 group('Keycap',tabs('unit','Tamaño','1',['1|1u','1.25|1.25u','1.5|1.5u','2|2u']),tabs('profile','Perfil','conic',['flat|Plano','conic|Cónico','cylindrical|Cilíndrico']),num('height','Altura de la keycap · mm',8,5,18),num('wall','Pared de la keycap · mm',.8,.6,2.5),tabs('stem','Vástago','mx',['mx|Cruz MX','none|Sin vástago'])),
 group('Base',tabs('base','Variante de la base','semi',['open|Abierta','semi|Semi cerrada','closed|Cerrada','round|Redondeada']),check('loop','Argolla para llavero')),
 group('Ajustes de encastre',num('switchGap','Holgura del agujero del switch · mm',.1,0,1,.05),num('crossGap','Holgura de la cruz · mm',.1,0,.6,.05)),
 group('Vista',tabs('assembly','Disposición','assembled',['assembled|Armado','parts|Piezas separadas'])),
 group('Colores',color('capColor','Color de keycaps','#c1dce7'),color('baseColor','Color de base','#e6e6e6'),color('textColor','Color de leyenda','#f3cc7e'))]},
{id:'imagekey',title:'Llavero con imagen',icon:'◈',description:'Convertí una imagen en un llavero por colores, en relieve o plano cara abajo.',upload:'image-svg',groups:[
 group('Imagen',{type:'image',key:'upload'},{type:'adjust',key:'adjust'},check('background','Mantener fondo'),num('colors','Cantidad de colores',6,2,12,1),num('resolution','Detalle de contorno · px',80,24,160,8)),
 group('Tamaño',tabs('dimension','Fijar','width',['width|Ancho','height|Alto']),num('measure','Medida · mm',50,20,150),tabs('measureMode','La medida corresponde a','all',['all|La pieza completa','drawing|Solo el dibujo'])),
 group('Modo',tabs('mode','Construcción','raised',['raised|Relieve','flat|Plano (cara abajo)']),num('thickness','Grosor de base · mm',2,.6,6),num('relief','Alto del dibujo · mm',.8,.2,3)),
 group('Argolla',check('loop','Agregar argolla'),num('hole','Diámetro del agujero · mm',4,2,10),tabs('loopSide','Ubicación','top',['top|Arriba','left|Izquierda','right|Derecha'])),
 group('Colores',color('baseColor','Color de la base','#f4f4f4'))]},
{id:'organizer',title:'Organizador de cajones',icon:'▥',description:'Medí tu cajón, elegí los compartimentos y descargá las piezas que entran en tu impresora.',groups:[
 group('Cajón',num('width','Ancho · mm',300,40,1000),num('depth','Profundidad · mm',400,40,1000),num('height','Alto · mm',60,10,200)),
 group('Compartimentos',num('cols','Columnas (a lo ancho)',3,1,12,1),num('rows','Filas (a lo profundo)',4,1,12,1)),
 group('Piezas',tabs('pieces','División','auto',['auto|Automático','single|Una sola','cell|Una por hueco']),select('bed','Tamaño de tu cama','250',['180|180 × 180 mm','220|220 × 220 mm','250|250 × 250 mm','256|256 × 256 mm','300|300 × 300 mm','350|350 × 350 mm'])),
 group('Caja',num('boxHeight','Alto de las cajas · mm',55,8,200),num('wall','Grosor de pared · mm',1.6,.6,5),num('floor','Grosor del piso · mm',1.2,.6,5),num('radius','Esquinas redondeadas · mm',4,0,20),num('divider','Grosor de los divisores · mm',1.2,.6,5),num('dividerHeight','Alto de los divisores · %',100,20,100,5),num('gap','Holgura con el cajón · mm',2,0,10)),
 group('Color de la vista',color('baseColor','Color','#9ccddd'))]},
{id:'cut',title:'Cortador de STL',icon:'✂',description:'Subí un modelo más grande que tu cama y descargalo en piezas con encastres para que al pegarlas queden alineadas.',upload:'model',groups:[
 group('Modelo',{type:'model',key:'upload'},num('scale','Escala · %',100,1,500,1)),
 group('Tu impresora',num('bedX','Cama X · mm',256,40,1000),num('bedY','Cama Y · mm',256,40,1000),num('bedZ','Cama Z · mm',256,40,1000)),
 group('Cortes',{type:'cuts',key:'cuts'}),
 group('Encastres',tabs('joint','Tipo','peg',['peg|Pernos','dowel|Espigas','magnet|Imanes','none|Ninguno']),num('spacing','Separación entre encastres · mm',35,12,100),num('pin','Diámetro · mm',4,2,12),num('pinLength','Profundidad por lado · mm',5,2,15),num('tolerance','Holgura radial · mm',.25,0,.8,.05)),
 group('Vista',num('separation','Separación de piezas · mm',8,0,50),color('baseColor','Color','#c1dce7'))]},
{id:'viewer',title:'Visor 3D de modelos',icon:'◎',description:'Visualizá y analizá tus modelos 3D con medidas exactas, volumen y estimación de peso.',upload:'model',groups:[
 group('Dibujo',{type:'model',key:'upload'}),group('Modelo',num('scale','Escala · %',100,1,500,1),num('rotateX','Rotación X · °',0,-180,180,90),num('rotateY','Rotación Y · °',0,-180,180,90),num('rotateZ','Rotación Z · °',0,-180,180,90)),group('Material',num('density','Densidad · g/cm³',1.24,.5,3,.01),num('fill','Fracción de volumen · %',100,1,100,1)),group('Cama',num('bedX','Cama X · mm',256,40,1000),num('bedY','Cama Y · mm',256,40,1000),num('bedZ','Cama Z · mm',256,40,1000))]}
];
export const fields=tool=>tool.groups.flatMap(g=>g.fields);
export const defaults=tool=>Object.fromEntries(fields(tool).filter(f=>f.value!==undefined).map(f=>[f.key,f.value]));
export const swatches=['#e64e7c','#f6b1c6','#df1736','#ff8618','#ffcd19','#7dc33e','#27b5c5','#346ed3','#9061c4','#93613d','#f4f2ec','#292929'];
