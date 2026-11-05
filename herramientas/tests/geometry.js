import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tools,fields,defaults} from '../src/catalog.js';
import {generate,metrics,box,normalize,automaticCuts} from '../src/geometry.js';
import {stl,threeMF,partsZip} from '../src/files.js';
import {unzipSync,strFromU8} from 'fflate';
const image={width:32,height:24,data:new Uint8ClampedArray(32*24*4)};for(let y=0;y<24;y++)for(let x=0;x<32;x++){const k=(y*32+x)*4;image.data.set([x<16?255:30,y<12?80:210,80,(x<2||y<2)?0:255],k);}
const input=normalize(box(100,80,60)),ctx={image,models:[input]};const results=[];let failed=0;
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS',name);}catch(e){failed++;results.push({name,ok:false,error:e.stack});console.error('FAIL',name,e.message);}}
function validate(m){const info=metrics(m);assert.ok(info.triangles>0);assert.ok(Number.isFinite(info.volume)&&info.volume>0);m.traverse(m=>{if(m.isMesh)for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});const bin=stl(m);assert.equal(bin.byteLength,84+info.triangles*50);return info;}
assert.equal(tools.length,8);
for(const tool of tools){test(tool.id+' default',()=>validate(generate(tool.id,defaults(tool),ctx)));for(const f of fields(tool))if(f.options&&f.type!=='presets')for(const o of f.options){const val=o.split('|')[0];if(val===String(f.value))continue;test(tool.id+' '+f.key+'='+val,()=>validate(generate(tool.id,{...defaults(tool),[f.key]:val},ctx)));}}
for(const id of ['pixel','imagekey','cut','viewer'])test(id+' requires uploaded file',()=>assert.throws(()=>generate(id,defaults(tools.find(t=>t.id===id)),{}),/Subí/));
test('Plate dimensions, relief and material colors',()=>{const p=defaults(tools[0]),m=generate('plate',p),stats=metrics(m);assert.ok(Math.abs(stats.size.x-p.width)<.01);assert.ok(Math.abs(stats.size.y-p.height)<.01);assert.ok(stats.size.z>p.thickness);const z=unzipSync(threeMF(m));assert.match(strFromU8(z['3D/3dmodel.model']),/<components>/);assert.ok(Object.keys(unzipSync(partsZip(m,true))).length>=4);});
test('Automatic organizer fits 250 mm bed',()=>{const t=tools.find(t=>t.id==='organizer'),m=generate('organizer',defaults(t));assert.equal(m.children.length,4);for(const c of m.children){const s=metrics(c).size;assert.ok(s.x<=250&&s.y<=250);}});
test('Automatic cuts fit requested bed spacing',()=>{const t=tools.find(t=>t.id==='cut'),p={...defaults(t),bedX:45,bedY:45,bedZ:45,joint:'none'},cuts=automaticCuts(p,ctx);assert.equal(cuts.length,5);validate(generate(t.id,p,{models:[input],cuts}));});
test('Single plane preserves cube volume',()=>{const t=tools.find(t=>t.id==='cut'),p={...defaults(t),joint:'none',separation:0};const m=generate('cut',p,{models:[input],cuts:[{axis:'x',position:0,joint:'none'}]});assert.ok(Math.abs(metrics(m).volume-480000)<.1);assert.equal(m.children.length,2);});
for(const joint of ['peg','dowel','magnet'])test('Connector '+joint,()=>{const p={...defaults(tools.find(t=>t.id==='cut')),joint,separation:0};validate(generate('cut',p,{models:[input],cuts:[{axis:'x',position:0,joint}]}));});
test('Local timezone changes visible stars',()=>{const p=defaults(tools.find(t=>t.id==='stars')),a=generate('stars',p),b=generate('stars',{...p,utc:9});assert.notEqual(metrics(a).volume,metrics(b).volume);});
fs.writeFileSync('tests/results.json',JSON.stringify({passed:results.length-failed,failed,results},null,2));console.log(`${results.length-failed}/${results.length} passed`);if(failed)process.exitCode=1;
