import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',outfile:'app.js',target:'es2022',loader:{'.ttf':'binary'},legalComments:'linked'});
await fs.copyFile('src/style.css','app.css');await fs.copyFile('src/index.html','index.html');
await fs.mkdir('licenses',{recursive:true});
for(const pkg of ['three','three-bvh-csg','three-mesh-bvh','qrcode','fflate','opentype.js','esbuild'])for(const name of ['LICENSE','LICENSE.txt','LICENSE.md'])try{await fs.copyFile(`node_modules/${pkg}/${name}`,`licenses/${pkg.replace('.js','')}.txt`);break;}catch{}
const [html,css,js]=await Promise.all(['index.html','app.css','app.js'].map(f=>fs.readFile(f,'utf8')));
await fs.writeFile('Herramientas-portatil.html',html.replace('<link rel="stylesheet" href="app.css">',()=>'<style>'+css+'</style>').replace('<script defer src="app.js"></script>','').replace('</body>',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>'));
console.log('8 herramientas compiladas.');
