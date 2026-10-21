/* Orders use the existing authenticated, optimistic user_data transaction. */
const ORDER_STATES = ['Nuevo/Pendiente','En preparación','Imprimiendo','Postprocesado/terminaciones','Listo para entregar','Entregado','Cancelado'];
let orderFilters = {search:'',state:'',sort:'newest'};
const orderState = o => ({Pendiente:'Nuevo/Pendiente',Nuevo:'Nuevo/Pendiente',Listo:'Listo para entregar',Completado:'Entregado'})[o.status] || o.status || ORDER_STATES[0];
const orderTotal = items => roundMoney(items.reduce((n,i)=>n+Number(i.qty)*Number(i.unitPrice),0));
const orderDateValid = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const orderDateLabel = v => orderDateValid(v || '') ? v.split('-').reverse().join('/') : 'Sin fecha';
const orderSale = o => get('sales').find(s=>(o.id && s.orderId===o.id) || (o.saleId && s.id===o.saleId) || (o.quoteId && s.quoteId===o.quoteId));
function orders() {
  const rows=get('orders'), photos=[];
  const counts=Object.fromEntries(ORDER_STATES.map(s=>[s,rows.filter(o=>orderState(o)===s).length]));
  const states=[...new Set([...ORDER_STATES,...rows.map(orderState)])];
  $('#m').innerHTML=`<section id="orders-ui"><h2>Pedidos</h2><p class="s">De la idea a la entrega. Los pedidos y las señas no se suman al balance de ventas.</p>
    <button class="p" id="order-new">+ Nuevo pedido</button><div id="order-editor"></div>
    <div class="order-counts">${ORDER_STATES.map((s,i)=>`<span class="order-badge state-${i}">${esc(s)} <strong>${counts[s]}</strong></span>`).join('')}</div>
    <div class="card g"><label>Buscar cliente o producto<input id="order-search" type="search" value="${esc(orderFilters.search)}" placeholder="Nombre del cliente o producto"></label>
    <label>Estado<select id="order-filter"><option value="">Todos (${rows.length})</option>${states.map(s=>`<option ${orderFilters.state===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
    <label>Orden<select id="order-sort"><option value="newest">Más recientes primero</option><option value="oldest">Más antiguos primero</option><option value="delivery">Próxima entrega</option></select></label></div>
    <p id="order-results" class="s" aria-live="polite"></p><div class="product-grid" id="order-list"></div></section>`;
  $('#order-sort').value=orderFilters.sort;
  const draw=()=>{
    photos.length=0;
    const search=orderFilters.search.toLocaleLowerCase('es');
    const list=rows.map((o,index)=>({o,index})).filter(({o})=>(!orderFilters.state || orderState(o)===orderFilters.state) && [o.client,...recordItems(o).map(i=>i.name)].join(' ').toLocaleLowerCase('es').includes(search));
    list.sort((a,b)=>orderFilters.sort==='delivery' ? (a.o.deliveryDate || '9999').localeCompare(b.o.deliveryDate || '9999') : (orderFilters.sort==='oldest'?1:-1)*String(a.o.date || '').localeCompare(String(b.o.date || '')));
    $('#order-results').textContent=`${list.length} de ${rows.length} pedidos`;
    $('#order-list').innerHTML=list.map(({o,index})=>{
      const items=recordItems(o),total=knownNumber(o.total) ?? orderTotal(items),paid=knownNumber(o.deposit) ?? 0,status=orderState(o),sold=orderSale(o) || o.saleId;
      return `<article class="product-card"><div class="product-body"><span class="order-badge state-${ORDER_STATES.indexOf(status)}">${esc(status)}</span><h3>${esc(o.client || 'Cliente sin registrar')}</h3>
        <p>Pedido: ${orderDateLabel(o.date)}<br>Entrega estimada: ${orderDateLabel(o.deliveryDate)}</p>
        ${items.map(i=>{const n=photos.push(i)-1;return `<div class="order-item"><div class="product-photo" data-photo="${n}"><small>Sin foto</small></div><div><strong>${esc(i.name)}</strong><p>${i.qty} × ${money2(i.unitPrice)}</p></div></div>`;}).join('')}
        <dl><div><dt>Total acordado</dt><dd>${money2(total)}</dd></div><div><dt>Seña / pagado</dt><dd>${money2(paid)}</dd></div><div><dt>Saldo</dt><dd>${money2(roundMoney(total-paid))}</dd></div></dl>
        <details><summary>Ver detalles</summary><p class="order-notes">${esc(o.notes || 'Sin observaciones')}</p>${o.quoteId?'<p>Vinculado a un presupuesto.</p>':''}${sold?'<p>Venta ya registrada. Los cambios del pedido no modifican esa venta.</p>':''}<p>Última actualización: ${esc(o.updatedAt || 'Sin registrar')}</p></details>
        <label>Estado<select data-order-state="${index}">${[...new Set([...ORDER_STATES,status])].map(s=>`<option ${s===status?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
        <div class="order-actions"><button class="s2" data-order-edit="${index}">Editar pedido</button>${!['Entregado','Cancelado'].includes(status)?`<button class="p" data-order-deliver="${index}">Marcar entregado</button>`:''}
        ${status==='Entregado' && !sold?`<button class="s2" data-order-sale="${index}" ${paid<total?'disabled':''}>Registrar venta cobrada</button>${paid<total?'<small>Actualizá el importe pagado cuando cobres el saldo.</small>':''}`:''}</div></div></article>`;
    }).join('') || '<p class="card">No hay pedidos para mostrar. Podés cargar también pedidos anteriores y entregados.</p>';
    $('#order-list').querySelectorAll('[data-order-edit]').forEach(b=>b.onclick=()=>orderEditor(Number(b.dataset.orderEdit)));
    $('#order-list').querySelectorAll('[data-order-state]').forEach(s=>s.onchange=async()=>{const index=Number(s.dataset.orderState);await changeOrderState(index,s.value);if(s.isConnected)s.value=orderState(get('orders')[index]);});
    $('#order-list').querySelectorAll('[data-order-deliver]').forEach(b=>b.onclick=()=>changeOrderState(Number(b.dataset.orderDeliver),'Entregado'));
    $('#order-list').querySelectorAll('[data-order-sale]').forEach(b=>b.onclick=()=>registerOrderSale(Number(b.dataset.orderSale)));
    loadProductPhotos($('#order-list'),photos,currentUser?.id);
  };
  $('#order-search').oninput=e=>{orderFilters.search=e.target.value;draw();};
  $('#order-filter').onchange=e=>{orderFilters.state=e.target.value;draw();};
  $('#order-sort').onchange=e=>{orderFilters.sort=e.target.value;draw();};
  $('#order-new').onclick=()=>orderEditor();draw();
}
function changeOrderState(index,status) {
  return commerceChange(next=>{const o=next.orders[index];o.id ||= crypto.randomUUID();o.status=status;o.updatedAt=new Date().toISOString();},'Estado actualizado',orders);
}
function orderEditor(index) {
  const original=index===undefined?null:get('orders')[index],locked=!!(original && (orderSale(original)||original.saleId));
  let items=original?structuredClone(recordItems(original)):[],quoteIndex='';
  const products=get('products');
  $('#order-editor').innerHTML=`<form id="order-form" class="card"><h3>${original?'Editar pedido':'Nuevo pedido'}</h3><p class="s">Podés elegir una fecha pasada y el estado actual para registrar trabajos anteriores.</p>
    ${!original?`<label>Importar presupuesto (opcional)<select id="order-quote"><option value="">Sin presupuesto</option>${get('quotes').map((q,i)=>`<option value="${i}">${esc(q.client || 'Sin cliente')} — ${esc(q.desc || 'Presupuesto')} — ${money2(Number(q.total)||0)}</option>`).join('')}</select></label>`:''}
    <div class="g"><label>Cliente<input name="client" required maxlength="250" value="${esc(original?.client || '')}"></label>
    <label>Fecha de pedido<input name="date" type="date" required value="${esc(original?.date || localDate())}"></label>
    <label>Entrega estimada<input name="deliveryDate" type="date" value="${esc(original?.deliveryDate || '')}"></label>
    <label>Estado<select name="status">${[...new Set([...ORDER_STATES,orderState(original || {})])].map(s=>`<option ${s===orderState(original || {})?'selected':''}>${esc(s)}</option>`).join('')}</select></label></div>
    <fieldset ${locked?'disabled':''}><legend>Productos y precio acordado</legend><div class="g"><label>Catálogo<select id="order-product"><option value="">Elegí un producto</option>${products.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('')}</select></label><button type="button" class="s2" id="order-add-item">Agregar producto</button></div><div id="order-items"></div>
    <label>Seña / total pagado (AR$)<input name="deposit" type="number" min="0" step="0.01" required value="${knownNumber(original?.deposit) ?? 0}"></label></fieldset>
    ${locked?'<p class="s">La venta ya está registrada: se conservan los importes y productos originales.</p>':''}
    <p id="order-total" aria-live="polite"></p><label>Notas / observaciones<textarea name="notes" maxlength="4000" rows="3">${esc(original?.notes || '')}</textarea></label>
    <div class="order-actions"><button class="p" type="submit">Guardar pedido</button><button class="s2" id="order-cancel" type="button">Cerrar</button></div></form>`;
  const form=$('#order-form'),f=form.elements;
  const totals=()=>{const total=orderTotal(items);$('#order-total').textContent=`Total: ${money2(total)} · Saldo: ${money2(roundMoney(total-Number(f.deposit.value)))}`;};
  const drawItems=()=>{
    $('#order-items').innerHTML=items.map((item,i)=>`<div class="order-edit-item"><strong>${esc(item.name)}</strong><label>Cantidad<input data-order-qty="${i}" type="number" min="1" step="1" required value="${item.qty}"></label><label>Precio unitario (AR$)<input data-order-price="${i}" type="number" min="0" step="0.01" required value="${item.unitPrice}"></label><button class="s2" type="button" data-order-remove="${i}">Quitar</button></div>`).join('');
    for(const key of ['qty','price']) $('#order-items').querySelectorAll(`[data-order-${key}]`).forEach(input=>input.oninput=()=>{const i=Number(input.dataset[key==='qty'?'orderQty':'orderPrice']);items[i][key==='qty'?'qty':'unitPrice']=Number(input.value);items[i].subtotal=roundMoney(items[i].qty*items[i].unitPrice);totals();});
    $('#order-items').querySelectorAll('[data-order-remove]').forEach(b=>b.onclick=()=>{items.splice(Number(b.dataset.orderRemove),1);drawItems();});totals();
  };
  $('#order-add-item').onclick=()=>{const value=$('#order-product').value;if(value==='')return toast('Elegí un producto del catálogo.');const p=products[Number(value)];items.push(snapshotItem(p,1,knownNumber(p.price) ?? 0));drawItems();};
  if($('#order-quote'))$('#order-quote').onchange=e=>{
    quoteIndex=e.target.value;
    if(quoteIndex===''){items=[];drawItems();return;}
    const q=get('quotes')[Number(quoteIndex)];items=structuredClone(recordItems(q));f.client.value=q.client || '';
    // A single legacy quote may only have a total; recordItems preserves it.
    drawItems();
  };
  f.deposit.oninput=totals;$('#order-cancel').onclick=()=>{$('#order-editor').innerHTML='';};
  form.onsubmit=async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const total=orderTotal(items),deposit=Number(f.deposit.value),date=f.date.value,deliveryDate=f.deliveryDate.value;
    if(!f.client.value.trim())return toast('Ingresá el cliente.');
    if(!items.length || !items.every(validItem) || !Number.isSafeInteger(Math.round(total*100)))return toast('Agregá productos con cantidades enteras positivas y precios válidos.');
    if(!Number.isFinite(deposit)||deposit<0||deposit>total)return toast('El importe pagado debe estar entre cero y el total.');
    if(!orderDateValid(date) || (deliveryDate && (!orderDateValid(deliveryDate)||deliveryDate<date)))return toast('Revisá las fechas: la entrega no puede ser anterior al pedido.');
    const value={...(original || {}),id:original?.id || crypto.randomUUID(),client:f.client.value.trim(),date,deliveryDate,status:f.status.value,notes:f.notes.value.trim(),items:structuredClone(items),total,deposit,updatedAt:new Date().toISOString()};
    if(locked){value.items=original.items;value.total=original.total;value.deposit=original.deposit;}
    await commerceChange(next=>{
      if(quoteIndex!==''){
        const q=next.quotes[Number(quoteIndex)];q.id ||= crypto.randomUUID();
        if(next.orders.some(o=>o.quoteId===q.id))throw Error('Este presupuesto ya tiene un pedido. Editá el pedido existente.');
        value.quoteId=q.id;
        const sale=next.sales.find(s=>s.quoteId===q.id);if(sale)value.saleId=sale.id;
        if(q.status==='Vendido' && !sale)throw Error('El presupuesto ya figura vendido. Cargá el pedido sin vincularlo para evitar duplicados.');
      }
      if(original)next.orders[index]=value;else next.orders.push(value);
    },'Pedido guardado',orders);
  };
  drawItems();form.scrollIntoView({behavior:'smooth',block:'start'});f.client.focus();
}
async function registerOrderSale(index) {
  if(commerceBusy)return;
  if(!confirm('¿Registrar este pedido como venta cobrada? Se sumará al balance de ventas. Si ya registraste la venta manualmente, cancelá para no duplicarla.'))return;
  await commerceChange(next=>{
    const o=next.orders[index];o.id ||= crypto.randomUUID();
    if(o.saleId || next.sales.some(s=>s.orderId===o.id || (o.quoteId && s.quoteId===o.quoteId)))throw Error('Este pedido ya tiene una venta registrada.');
    if(orderState(o)!=='Entregado' || knownNumber(o.deposit)!==knownNumber(o.total))throw Error('El pedido debe estar entregado y cobrado por completo.');
    const q=o.quoteId?next.quotes.find(q=>q.id===o.quoteId):null;
    if(q?.status==='Vendido')throw Error('El presupuesto ya está vendido. No se creará otra venta.');
    const items=structuredClone(recordItems(o)),id=crypto.randomUUID();
    next.sales.push({id,orderId:o.id,quoteId:o.quoteId || null,date:localDate(),client:o.client,name:items.map(i=>i.name).join(', '),items,qty:items.reduce((n,i)=>n+i.qty,0),total:o.total,cost:items.every(i=>knownNumber(i.unitCost)!==null)?roundMoney(items.reduce((n,i)=>n+i.qty*i.unitCost,0)):null});
    o.saleId=id;o.updatedAt=new Date().toISOString();if(q)q.status='Vendido';
  },'Venta registrada una sola vez',orders);
}
