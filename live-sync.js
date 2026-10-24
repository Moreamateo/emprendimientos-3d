/* Realtime invalidates cached data; each event reads the current account again.
   Never replace an open draft, a pending save, or a transaction in flight. */
let liveChannel=null,livePoll=null,liveTimer=null,liveReading=false,liveGeneration=0;
let pageDraftDirty=false,remotePending=false,pageDraftTransient=false,pageAutoEditing=false;
function resetPageDraft(){pageDraftDirty=false;pageDraftTransient=false;pageAutoEditing=false;}
function liveNotice(message){
  let box=document.getElementById('live-sync-notice');
  if(!box){
    box=document.createElement('div');box.id='live-sync-notice';box.className='card';box.hidden=true;
    box.setAttribute('role','status');box.setAttribute('aria-live','polite');
    const label=document.createElement('span');label.id='live-sync-message';box.append(label);
    const button=document.createElement('button');button.type='button';button.className='s2';button.textContent='Ver cambios de la nube';button.onclick=reloadLiveData;box.append(button);
    document.querySelector('.user-bar').prepend(box);
    box.style.cssText='margin:10px 0;padding:10px;white-space:normal';
  }
  document.getElementById('live-sync-message').textContent=message || '';
  box.hidden=!message;
}
function showCloudConflict(){remotePending=true;liveNotice(saveError?.message || 'Hay cambios de la nube pendientes de revisar.');}
function liveBusy(){return navigationBusy || commerceBusy || productBusy || saveInFlight>0 || !!saveTimer;}
function requestLiveRead(){clearTimeout(liveTimer);liveTimer=setTimeout(readLiveData,150);}
async function readLiveData(){
  if(!currentUser || !cloudLoaded || liveReading)return;
  if(liveBusy()){requestLiveRead();return;}
  const generation=liveGeneration,userId=currentUser.id,signature=JSON.stringify(D);
  liveReading=true;
  try{
    const {data,error}=await sb.from('user_data').select('data').eq('user_id',userId).maybeSingle();
    if(error)throw error;
    if(!data?.data || generation!==liveGeneration || currentUser?.id!==userId || !cloudLoaded)return;
    if(liveBusy() || signature!==JSON.stringify(D)){requestLiveRead();return;}
    const next=normalizeData(data.data);
    if(CloudTools.equal(next,D)){
      if(!saveError){remotePending=false;liveNotice('');}return;
    }
    if(pageDraftDirty || saveError || !CloudTools.equal(D,cloudBaseline)){
      remotePending=true;
      liveNotice(saveError?.message || 'Llegaron cambios desde otro dispositivo. Tu formulario sigue abierto; podés terminarlo antes de verlos.');return;
    }
    initData(next);rememberCloud(D);remotePending=false;render();liveNotice('');
  }catch(_){/* Realtime reconnects; the bounded poll also retries after a lost connection. */}
  finally{liveReading=false;}
}
async function reloadLiveData(){
  if(!currentUser || !cloudLoaded || liveBusy())return;
  if((pageDraftDirty || saveError || !CloudTools.equal(D,cloudBaseline)) && !confirm('¿Ver la versión de la nube? Se descartará el formulario abierto y los cambios locales que no se hayan guardado.'))return;
  const generation=liveGeneration,userId=currentUser.id;
  navigationBusy=true;
  const controls=[...document.querySelectorAll('#m button,#m input,#m select,#m textarea,#btn-refresh,#btn-logout')];
  const disabledBefore=controls.map(el=>el.disabled);
  controls.forEach(el=>el.disabled=true);
  try{
    const {data,error}=await sb.from('user_data').select('data').eq('user_id',userId).maybeSingle();
    if(error)throw error;
    if(!data?.data)throw Error('No se encontraron los datos de tu cuenta.');
    if(generation!==liveGeneration || currentUser?.id!==userId)return;
    initData(data.data);rememberCloud(D);saveError=null;remotePending=false;render();liveNotice('');toast('Datos actualizados');
  }catch(e){toast(e.message || 'No se pudo actualizar.');}
  finally{navigationBusy=false;controls.forEach((el,i)=>{if(el.isConnected)el.disabled=disabledBefore[i];});}
}
function startLiveSync(){
  stopLiveSync();
  const userId=currentUser?.id,generation=liveGeneration;
  if(!userId)return;
  liveChannel=sb.channel('user-data:'+userId)
    .on('postgres_changes',{event:'*',schema:'public',table:'user_data',filter:'user_id=eq.'+userId},()=>{if(generation===liveGeneration)requestLiveRead();})
    .subscribe(status=>{
      if(generation!==liveGeneration)return;
      let label=document.getElementById('live-connection-status');
      if(!label){label=document.createElement('div');label.id='live-connection-status';label.setAttribute('role','status');document.querySelector('.user-bar').append(label);}
      label.textContent=status==='SUBSCRIBED'?'Sincronización conectada':'Reconectando sincronización…';
      if(status==='SUBSCRIBED')requestLiveRead();
    });
  livePoll=setInterval(requestLiveRead,15000);
}
function stopLiveSync(){
  liveGeneration++;clearInterval(livePoll);clearTimeout(liveTimer);livePoll=null;liveTimer=null;
  if(liveChannel){sb.removeChannel(liveChannel);liveChannel=null;}
  resetPageDraft();remotePending=false;
  document.getElementById('live-sync-notice')?.remove();document.getElementById('live-connection-status')?.remove();
  stopPhotoCleanup();
}
function autoSavedField(target){return cur==='fixed' || (cur==='calc' && target.id!=='profileName');}
function trackPageDraft(e){
  if(!e.target.closest('#m'))return;
  if(autoSavedField(e.target))pageAutoEditing=true;else pageDraftTransient=true;
  pageDraftDirty=pageDraftTransient || pageAutoEditing;
}
document.addEventListener('input',trackPageDraft);
document.addEventListener('change',trackPageDraft);
document.addEventListener('focusout',e=>{
  if(e.target.closest('#m') && autoSavedField(e.target)){
    pageAutoEditing=false;pageDraftDirty=pageDraftTransient;requestLiveRead();
  }
});
window.addEventListener('online',requestLiveRead);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestLiveRead();});
