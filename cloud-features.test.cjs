const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const tools=require('./cloud-tools.js');
const plain=v=>JSON.parse(JSON.stringify(v));
function app(){
  const elements=new Map(),listeners={},removed=[],writes=[],deleted=[],channels=[],responses=[];
  const node=()=>({style:{},classList:{add(){},remove(){}},append(){},prepend(){},setAttribute(){},remove(){elements.delete(this.id);}});
  for(const id of ['m','auth-eye','auth-pass','auth-btn','btn-refresh','btn-logout','user-bar'])elements.set(id,node());
  const document={hidden:false,querySelector:s=>elements.get(s.replace(/^[#.]/,'')) || node(),querySelectorAll:()=>[],getElementById:id=>elements.get(id) || null,addEventListener:(name,fn)=>{listeners[name]=fn;},createElement:()=>{
    const element=node();Object.defineProperty(element,'id',{set(id){this._id=id;elements.set(id,this);},get(){return this._id;}});return element;
  }};
  const sb={from:()=>{
    let write=false;
    const query={select(){return query;},eq(){return query;},is(){return query;},maybeSingle(){return Promise.resolve(responses.shift());},update(value){write=true;writes.push(value);return query;},then(resolve,reject){return Promise.resolve(write?{data:[{id:1}]}:responses.shift()).then(resolve,reject);}};
    return query;
  },channel:name=>{
    const channel={name,on(_type,filter,callback){this.filter=filter;this.callback=callback;return this;},subscribe(callback){this.status=callback;return this;}};channels.push(channel);return channel;
  },removeChannel:c=>removed.push(c),rpc:async()=>responses.shift(),storage:{from:()=>({remove:async paths=>{deleted.push(paths);return {error:null};}})}};
  const context=vm.createContext({console,structuredClone,crypto:require('node:crypto').webcrypto,document,location:{hash:'',pathname:'/',search:''},history:{},supabase:{createClient:()=>sb},window:{addEventListener(){}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){},confirm:()=>true});
  const run=code=>vm.runInContext(code,context);
  for(const file of ['cloud-tools.js','navigation.js'])run(fs.readFileSync(file,'utf8'));
  const html=fs.readFileSync('index.html','utf8');
  for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))run(match[1]);
  for(const file of ['live-sync.js','photo-cleanup.js'])run(fs.readFileSync(file,'utf8'));
  run("let rendered=0;render=()=>{rendered++;resetPageDraft();};toast=()=>{};currentUser={id:'account-a'};cloudLoaded=true;rememberCloud(D);");
  return {run,responses,writes,deleted,channels,removed,listeners,elements};
}
test('merges independent device edits without losing historical or unknown fields',()=>{
  const base={cfg:{pk:100,err:5},sales:[{total:10}],unknown:{value:1}};
  const local=structuredClone(base);local.cfg.pk=200;
  const remote=structuredClone(base);remote.sales.push({total:20});remote.unknown.value=2;
  const merged=tools.merge(base,local,remote);
  assert.equal(merged.cfg.pk,200);assert.equal(merged.sales.length,2);assert.equal(merged.unknown.value,2);assert.equal(base.cfg.pk,100);
});
test('conflicting arrays or settings are rejected instead of overwriting another device',()=>{
  assert.throws(()=>tools.merge({sales:[]},{sales:[1]},{sales:[2]}),/simultáneos/);
  assert.throws(()=>tools.merge({cfg:{wear:10}},{cfg:{wear:20}},{cfg:{wear:30}}),/cfg.wear/);
});
test('JSONB key ordering does not create phantom changes or edit conflicts',()=>{
  const local={cfg:{wear:10,err:5},sales:[{id:'x',total:10}]};
  const remote={sales:[{total:10,id:'x'}],cfg:{err:5,wear:10}};
  assert.equal(tools.equal(local,remote),true);
  assert.deepEqual(tools.merge(local,{...local,cfg:{wear:20,err:5}},remote).cfg,{wear:20,err:5});
});
test('shared wear preserves explicit zero and old settings; recursively finds duplicate and historical photos',()=>{
  assert.equal(tools.wear({wear:0,parts:100,life:2}),0);
  assert.equal(tools.wear({parts:100,life:2}),50);
  const refs=tools.photoReferences({products:[{photoPath:'a/x.jpg'},{photoPath:'a/x.jpg'}],sales:[{items:[{photoPath:'a/old.jpg'}]}],orders:[{items:[{photoPath:'a/order.jpg'}]}]});
  assert.deepEqual([...refs].sort(),['a/old.jpg','a/order.jpg','a/x.jpg']);
});
test('calculator applies error reserve before multiplier; zero error preserves old formula',()=>{
  const a=app();
  const v="{g:100,pk:1000,w:100,h:2,kwh:50,wear:10,laborRate:20,laborHours:1,ins:10,qty:2,mult:3,err:10}";
  const result=plain(a.run(`calculate3D(${v})`));
  assert.equal(result.base,160);assert.equal(result.contingency,16);assert.equal(result.all,176);assert.equal(result.price,528);assert.equal(result.unit,88);
  assert.equal(a.run(`calculate3D({...${v},err:0}).all`),160);
  assert.equal(a.run('normalizeData({cfg:{wear:12.5}}).cfg.wear'),12.5);
  assert.equal(a.run('normalizeData({cfg:{parts:120,life:6}}).cfg.wear'),20);
});
test('idle device immediately accepts remote data; active drafts survive remote changes',async()=>{
  const a=app(),remote=plain(a.run('D'));remote.sales.push({id:'new',total:100});
  a.responses.push({data:{data:remote}});await a.run('readLiveData()');
  assert.equal(a.run('D.sales.length'),1);assert.equal(a.run('rendered'),1);
  remote.sales.push({id:'another',total:200});a.run('pageDraftDirty=true');
  a.responses.push({data:{data:remote}});await a.run('readLiveData()');
  assert.equal(a.run('D.sales.length'),1);assert.equal(a.run('remotePending'),true);assert.equal(a.run('pageDraftDirty'),true);
});
test('in-flight saves and transactions block remote replacement',async()=>{
  for(const flag of ['saveInFlight=1','productBusy=true','commerceBusy=true','navigationBusy=true','saveTimer=1']){
    const a=app();a.run(flag);a.responses.push({data:{data:{sales:[1]}}});await a.run('readLiveData()');assert.equal(a.responses.length,1);assert.equal(a.run('rendered'),0);
  }
});
test('realtime subscribes to only the current user and ignores callbacks after logout',()=>{
  const a=app();a.run('startLiveSync()');const first=a.channels[0];
  assert.equal(first.filter.filter,'user_id=eq.account-a');
  a.run("currentUser={id:'account-b'};startLiveSync()");assert.equal(a.removed.length,1);
  assert.equal(a.channels[1].filter.filter,'user_id=eq.account-b');
  a.run('liveTimer=null');first.callback();assert.equal(a.run('liveTimer'),null);
  a.run('stopLiveSync()');assert.equal(a.removed.length,2);
});
test('autosave merges a remote addition and uses a version condition',async()=>{
  const a=app(),remote=plain(a.run('D'));remote.sales.push({id:'remote'});
  a.run('D.cfg.pk=12000');a.responses.push({data:{id:1,data:remote,updated_at:'v1'}});await a.run('queueSave()');
  assert.equal(a.writes.length,1);assert.equal(a.writes[0].data.sales.length,1);assert.equal(a.writes[0].data.cfg.pk,12000);assert.equal(a.run('saveError'),null);
});
test('autosave conflict leaves both local and cloud records intact',async()=>{
  const a=app(),remote=plain(a.run('D'));remote.sales.push({id:'remote'});
  a.run("D.sales.push({id:'local'})");a.responses.push({data:{id:1,data:remote,updated_at:'v1'}});await a.run('queueSave()');
  assert.equal(a.writes.length,0);assert.equal(a.run('D.sales[0].id'),'local');assert.ok(a.run('saveError'));assert.equal(a.run('remotePending'),true);
});
test('cleanup preserves snapshot photos, duplicates, and foreign paths; retries missing setup safely',async()=>{
  const a=app();a.responses.push({data:[{name:'account-a/unused.jpg'},{name:'account-a/history.jpg'},{name:'account-b/foreign.jpg'}]}, {data:{data:{sales:[{items:[{photoPath:'account-a/history.jpg'}]}]}}});
  await a.run('cleanupUnusedPhotos()');assert.deepEqual(plain(a.deleted),[['account-a/unused.jpg']]);
  const b=app();b.responses.push({error:{code:'PGRST202'}});await b.run('cleanupUnusedPhotos()');assert.equal(b.deleted.length,0);assert.match(b.elements.get('photo-cleanup-status').textContent,/pendiente de activar/);
});
test('all application scripts parse together without changing existing business modules',()=>{
  const html=fs.readFileSync('index.html','utf8');
  for(const file of [...html.matchAll(/<script src="([^"h][^"]*)"><\/script>/g)].map(m=>m[1]))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
  for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
});
