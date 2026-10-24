/* The RPC and restrictive Storage policy are installed by supabase-features.sql.
   Both check ALL persisted photoPath fields, including historical snapshots.
   Never delete directly from storage.objects: use the Storage API. */
let photoCleanupTimer=null,photoCleanupBusy=false,photoCleanupGeneration=0;
function stopPhotoCleanup(){clearTimeout(photoCleanupTimer);photoCleanupTimer=null;photoCleanupGeneration++;document.getElementById('photo-cleanup-status')?.remove();}
function schedulePhotoCleanup(delay=1000){
  clearTimeout(photoCleanupTimer);
  photoCleanupTimer=setTimeout(cleanupUnusedPhotos,delay);
}
function photoCleanupStatus(message){
  let label=document.getElementById('photo-cleanup-status');
  if(!label){label=document.createElement('div');label.id='photo-cleanup-status';label.setAttribute('role','status');document.querySelector('.user-bar').append(label);}
  label.textContent=message;
}
async function cleanupUnusedPhotos(){
  if(!currentUser || !cloudLoaded)return;
  if(photoCleanupBusy || liveBusy()){schedulePhotoCleanup(5000);return;}
  const userId=currentUser.id,generation=photoCleanupGeneration;
  photoCleanupBusy=true;
  let delay=60*60*1000;
  try{
    const {data:candidates,error}=await sb.rpc('unused_product_photos');
    if(error)throw error;
    if(currentUser?.id!==userId || generation!==photoCleanupGeneration)return;
    const {data:record,error:readError}=await sb.from('user_data').select('data').eq('user_id',userId).maybeSingle();
    if(readError)throw readError;
    if(!record?.data)throw Error('No se pudieron comprobar las referencias.');
    const used=CloudTools.photoReferences(record.data);
    const paths=(candidates || []).map(r=>r.name).filter(path=>productPhotoPath(path,userId) && !used.has(path));
    if(currentUser?.id!==userId || generation!==photoCleanupGeneration)return;
    if(paths.length){
      const {error:removeError}=await sb.storage.from(PRODUCT_BUCKET).remove(paths);
      if(removeError)throw removeError;
    }
    if(currentUser?.id!==userId || generation!==photoCleanupGeneration)return;
    photoCleanupStatus('Limpieza de fotos activa · conserva el historial');
    if(candidates?.length===100)delay=10000;
  }catch(e){
    if(currentUser?.id!==userId || generation!==photoCleanupGeneration)return;
    photoCleanupStatus(e.code==='PGRST202'?'Limpieza de fotos pendiente de activar en Supabase':'Limpieza de fotos pendiente · se reintentará');
  }finally{
    photoCleanupBusy=false;
    if(currentUser?.id===userId && generation===photoCleanupGeneration)schedulePhotoCleanup(delay);
  }
}
