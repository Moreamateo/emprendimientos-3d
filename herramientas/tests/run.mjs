import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({entryPoints:['tests/geometry.js'],outfile:'tests/test.cjs',bundle:true,platform:'node',format:'cjs',loader:{'.ttf':'binary'},logLevel:'warning'});
const r=spawnSync(process.execPath,['tests/test.cjs'],{stdio:'inherit'});process.exitCode=r.status;
