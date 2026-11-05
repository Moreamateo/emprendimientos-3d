import opentype from 'opentype.js';
import * as T from 'three';
import antonBytes from './fonts/Anton.ttf';
import scriptBytes from './fonts/Pacifico.ttf';
import {textMesh,extrude,bounds} from './core.js';
export function parseFont(bytes){return opentype.parse(bytes.buffer.slice(bytes.byteOffset||0,(bytes.byteOffset||0)+bytes.byteLength));}
const anton=parseFont(antonBytes),script=parseFont(scriptBytes);
export function lettering(value,size,depth,z,color,font='sans',custom=null){value=String(value||'').slice(0,100);if(!value.trim())return new T.Group();let m;if(font==='sans'&&!custom)m=textMesh(value,size,depth,z,color);else{const f=custom||(font==='script'?script:anton),path=f.getPath(value,0,0,size),sp=new T.ShapePath();for(const c of path.commands){if(c.type==='M')sp.moveTo(c.x,-c.y);else if(c.type==='L')sp.lineTo(c.x,-c.y);else if(c.type==='Q')sp.quadraticCurveTo(c.x1,-c.y1,c.x,-c.y);else if(c.type==='C')sp.bezierCurveTo(c.x1,-c.y1,c.x2,-c.y2,c.x,-c.y);else if(c.type==='Z')sp.currentPath.closePath();}const shapes=sp.toShapes(false);if(!shapes.length)throw Error('La tipografía no contiene contornos para este texto.');m=extrude(shapes,depth,z,color,'Texto');const b=bounds(m),c=b.getCenter(new T.Vector3());m.geometry.translate(-c.x,-c.y,0);}m.name='Texto';return m;}
export function fitText(text,w,h,z,depth,color,font,custom){const m=lettering(text,Math.max(h,2),depth,z,color,font,custom);if(!m.isMesh)return m;const b=bounds(m).getSize(new T.Vector3());m.scale.set(Math.min(w/b.x,h/b.y),Math.min(w/b.x,h/b.y),1);return m;}
