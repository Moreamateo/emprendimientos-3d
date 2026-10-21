// Hash routes work on static hosting, including direct links and browser reloads.
const PAGE_ROUTES={calc:'calculadora',fixed:'gastos-fijos',quotes:'presupuestos',products:'productos',orders:'pedidos',stock:'stock',sales:'ventas',stats:'estadisticas'};
let navigationBusy=false,pendingHashRoute=false;
function pageFromURL(){
  const slug=location.hash.replace(/^#\/?/,'');
  return Object.keys(PAGE_ROUTES).find(key=>PAGE_ROUTES[key]===slug) || 'calc';
}
function updatePageURL(){
  const hash='#/'+PAGE_ROUTES[cur];
  if(!pendingHashRoute && location.hash!==hash){
    const known=Object.values(PAGE_ROUTES).includes(location.hash.replace(/^#\/?/,''));
    history[known?'pushState':'replaceState']({page:cur},'',location.pathname+location.search+hash);
  }
  document.title=(NAMES[cur] || M[cur]?.t || 'Emprendimientos 3D')+' · Emprendimientos 3D';
}
async function navigatePage(page,{fromHistory=false,refresh=false}={}){
  if(!PAGE_ROUTES[page] || !currentUser || !cloudLoaded)return;
  if(navigationBusy || commerceBusy || productBusy){
    if(fromHistory){pendingHashRoute=true;scheduleHashNavigation();}
    return;
  }
  navigationBusy=true;
  let loaded=false;
  const userId=currentUser.id,state=D;
  const controls=[...document.querySelectorAll('#m button,#m input,#m select,#m textarea,#btn-refresh,#btn-logout')];
  const previous=controls.map(el=>el.disabled);
  controls.forEach(el=>el.disabled=true);
  document.querySelectorAll('#nav a').forEach(a=>a.setAttribute('aria-disabled','true'));
  document.getElementById('page-sync-status').textContent='Actualizando datos…';
  try{
    // Finish pending debounced saves before reading, so navigation never replaces them.
    await flushSave();
    if(currentUser?.id!==userId || D!==state)return;
    const {data,error}=await sb.from('user_data').select('data').eq('user_id',userId).maybeSingle();
    if(error)throw error;
    if(!data?.data)throw Error('No se encontraron los datos de tu cuenta.');
    if(currentUser?.id!==userId || D!==state)return;
    initData(data.data);cur=page;loaded=true;render();
    window.scrollTo({top:0,behavior:'instant'});
    if(refresh)toast('Datos actualizados');
  }catch(e){
    if(fromHistory)history.replaceState({page:cur},'',location.pathname+location.search+'#/'+PAGE_ROUTES[cur]);
    toast('No se pudo actualizar: '+(e.message || 'revisá la conexión.'));
  }finally{
    navigationBusy=false;
    controls.forEach((el,i)=>{if(el.isConnected)el.disabled=previous[i];});
    document.querySelectorAll('#nav a').forEach(a=>a.removeAttribute('aria-disabled'));
    document.getElementById('page-sync-status').textContent='';
    // Sales may reconcile old quotes; start that only after the navigation lock ends.
    if(loaded && cur==='sales' && currentUser?.id===userId && !commerceBusy && !pendingHashRoute)syncSoldQuotes();
    if(pendingHashRoute)scheduleHashNavigation();
  }
}
let hashTimer;
function scheduleHashNavigation(){
  clearTimeout(hashTimer);
  hashTimer=setTimeout(()=>{
    if(!currentUser || !cloudLoaded)return;
    if(navigationBusy || commerceBusy || productBusy){scheduleHashNavigation();return;}
    pendingHashRoute=false;
    navigatePage(pageFromURL(),{fromHistory:true});
  },50);
}
window.addEventListener('hashchange',()=>{pendingHashRoute=true;scheduleHashNavigation();});
