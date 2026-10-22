// The old quote conversion stored date/name/qty/total but omitted client and quoteId.
function soldQuotePlan(data) {
  const claimed=new Set(),actions=[],ambiguous=[];
  for(const [index,q] of (data.quotes || []).entries()) {
    if(q.status!=='Vendido')continue;
    if(q.id && data.sales.some(s=>s.quoteId===q.id))continue;
    const matches=data.sales.map((s,i)=>({s,i})).filter(({s,i})=>!claimed.has(i) && !s.quoteId &&
      (s.name || s.desc || '')===(q.desc || q.name || '') && (s.date || '')===(q.date || '') &&
      knownNumber(s.total)===knownNumber(q.total) && Number(s.qty || 1)===quoteDetails(q).qty &&
      (!s.client || s.client===q.client));
    if(matches.length>1){ambiguous.push({quote:index,candidates:matches.map(m=>m.i)});continue;}
    if(matches.length===1){claimed.add(matches[0].i);actions.push({quote:index,sale:matches[0].i});}
    else actions.push({quote:index,sale:null});
  }
  return {actions,ambiguous};
}
async function syncSoldQuotes() {
  const plan=soldQuotePlan(D);
  if(!plan.actions.length){if(plan.ambiguous.length)toast('Hay ventas antiguas iguales: revisá sus vínculos antes de importar para evitar duplicados.');return;}
  await commerceChange(next=>{
    for(const action of soldQuotePlan(next).actions) {
      const q=next.quotes[action.quote];q.id ||= crypto.randomUUID();
      const items=structuredClone(recordItems(q));
      if(action.sale!==null){
        const sale=next.sales[action.sale];sale.id ||= crypto.randomUUID();sale.quoteId=q.id;
        if(!sale.client)sale.client=q.client || '';
        if(!Array.isArray(sale.items) || !sale.items.length)sale.items=items;
      }else{
        next.sales.push({id:crypto.randomUUID(),quoteId:q.id,date:q.date || '',client:q.client || '',name:q.desc || items.map(i=>i.name).join(', '),items,qty:items.reduce((n,i)=>n+i.qty,0),total:knownNumber(q.total) ?? roundMoney(items.reduce((n,i)=>n+i.subtotal,0)),cost:items.every(i=>i.unitCost!==null)?roundMoney(items.reduce((n,i)=>n+i.qty*i.unitCost,0)):null});
      }
    }
  },'Presupuestos vendidos sincronizados con sus clientes',()=>sales(false));
}
function quoteSyncReview() {
  const root=$('#quote-sync-review'),plan=soldQuotePlan(D);
  root.innerHTML=plan.ambiguous.map(a=>`<div class="card"><p>El presupuesto de <strong>${esc(D.quotes[a.quote].client || 'Cliente sin registrar')}</strong> (${esc(D.quotes[a.quote].desc || 'Sin detalle')}) coincide con varias ventas antiguas. Elegí cuál corresponde para completar sus datos sin duplicarla.</p><label>Venta existente<select data-quote-match="${a.quote}"><option value="">Elegí una venta</option>${a.candidates.map(i=>`<option value="${i}">Venta ${i+1} · ${esc(D.sales[i].client || 'Sin cliente')} · ${esc(D.sales[i].name)} · ${esc(D.sales[i].date)} · ${money2(Number(D.sales[i].total)||0)}</option>`).join('')}</select></label><button class="s2" data-link-quote="${a.quote}">Vincular venta</button></div>`).join('');
  root.querySelectorAll('[data-link-quote]').forEach(b=>b.onclick=async()=>{
    const index=Number(b.dataset.linkQuote),value=root.querySelector(`[data-quote-match="${index}"]`).value;
    if(value==='')return toast('Elegí la venta correspondiente.');
    await commerceChange(next=>{
      const q=next.quotes[index],s=next.sales[Number(value)];
      if(s.quoteId)throw Error('Esa venta ya está vinculada. Recargá la página.');
      q.id ||= crypto.randomUUID();s.id ||= crypto.randomUUID();s.quoteId=q.id;if(!s.client)s.client=q.client || '';
      if(!s.items?.length)s.items=structuredClone(recordItems(q));
    },'Venta vinculada al presupuesto',()=>sales(false));
  });
}
async function deleteSale(index) {
  if(commerceBusy)return;
  const sale=get('sales')[index];if(!sale)return;
  if(soldQuotePlan(D).ambiguous.some(a=>a.candidates.includes(index)))return toast('Primero vinculá el presupuesto en el aviso de ventas antiguas para poder eliminar la venta correcta.');
  if(!confirm(`¿Eliminar la venta de ${sale.client || 'cliente sin registrar'} por ${money2(Number(sale.total)||0)}? Se quitará del balance. El presupuesto vinculado volverá a Pendiente; el pedido se conservará sin venta registrada.`))return;
  await commerceChange(next=>{
    const removed=next.sales[index];
    next.sales.splice(index,1);
    const quote=next.quotes.find(q=>removed.quoteId && q.id===removed.quoteId);
    if(quote && !next.sales.some(s=>s.quoteId===quote.id))quote.status='Pendiente';
    for(const order of next.orders)if((removed.id && order.saleId===removed.id) || (removed.orderId && order.id===removed.orderId))delete order.saleId;
  },'Venta eliminada',()=>sales(false));
}
function editStockWeight(index) {
  const item=get('stock')[index];if(!item || commerceBusy)return;
  const grams=knownNumber(item.grams) ?? (knownNumber(item.kg) ?? 0)*1000;
  const capacity=knownNumber(item.total) || Math.max(1000,grams);
  const root=$('#stock-editor');
  root.innerHTML=`<form class="card" id="stock-weight-form"><h3>Modificar stock: ${esc(item.name || 'Material')}</h3><div class="g">
    <label>Kilos restantes<input name="kg" type="number" min="0" step="0.001" required value="${Math.round(grams)/1000}"></label>
    <label>Capacidad total (kg)<input name="capacity" type="number" min="0.001" step="0.001" required value="${Math.round(capacity)/1000}"></label></div>
    <p class="s">Ejemplo: 0,750 kg son 750 gramos. Podés dejar el restante en cero si se terminó.</p>
    <div class="order-actions"><button class="p" type="submit">Guardar kilos</button><button class="s2" id="stock-weight-cancel" type="button">Cancelar</button></div></form>`;
  $('#stock-weight-cancel').onclick=()=>{root.innerHTML='';};
  $('#stock-weight-form').onsubmit=async e=>{
    e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
    const kg=Number(form.elements.kg.value),total=Number(form.elements.capacity.value);
    if(!Number.isFinite(kg)||!Number.isFinite(total)||kg<0||total<=0||kg>total||!Number.isSafeInteger(Math.round(total*1000)))return toast('Los kilos restantes deben estar entre cero y la capacidad total.');
    await commerceChange(next=>{const row=next.stock[index];row.id ||= crypto.randomUUID();
      next.stockMovements.push({id:crypto.randomUUID(),stockId:row.id,date:localDate(),grams:Math.round(kg*1000)-(row.grams ?? (row.kg || 0)*1000),kind:'adjustment'});
      row.grams=Math.round(kg*1000);row.total=Math.round(total*1000);if('kg' in row)row.kg=row.grams/1000;},'Kilos de stock actualizados',()=>stock(item.other?'other':'fil'));
  };
  root.scrollIntoView({behavior:'smooth',block:'start'});$('#stock-weight-form').elements.kg.focus();
}
