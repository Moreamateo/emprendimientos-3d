function editSale(index) {
  const original=get('sales')[index];
  if(!original || commerceBusy)return;
  let items=structuredClone(recordItems(original));
  const products=get('products'),root=$('#sale-editor');
  root.innerHTML=`<form class="card" id="sale-edit-form"><h3>Editar venta</h3>
    <p class="s">Se actualizarán esta venta y sus totales en las estadísticas.${original.orderId || original.quoteId?' El pedido y el presupuesto vinculados conservan sus datos originales.':''}</p>
    <div class="g"><label>Cliente<input name="client" maxlength="250" value="${esc(original.client || '')}" placeholder="Consumidor final"></label>
    <label>Fecha<input name="date" type="date" required value="${esc(original.date || '')}"></label>
    <label>Nombre / detalle de la venta<input name="title" maxlength="500" required value="${esc(original.name || original.desc || items.map(i=>i.name).join(', '))}"></label></div>
    ${financeFields('sales',original)}<div id="sale-edit-items"></div>
    <div class="g"><label>Agregar del catálogo<select id="sale-edit-product"><option value="">Ítem manual</option>${products.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('')}</select></label><button type="button" class="s2" id="sale-edit-add">Agregar ítem</button></div>
    <p id="sale-edit-total" aria-live="polite"></p><div class="order-actions"><button class="p" type="submit">Guardar cambios de venta</button><button class="s2" type="button" id="sale-edit-cancel">Cancelar edición</button></div></form>`;
  const form=$('#sale-edit-form');
  const totals=()=>{
    const total=roundMoney(items.reduce((n,i)=>n+i.qty*i.unitPrice,0)),cost=items.every(i=>knownNumber(i.unitCost)!==null)?roundMoney(items.reduce((n,i)=>n+i.qty*i.unitCost,0)):null;
    $('#sale-edit-total').textContent=`Total: ${money2(total)} · Costo: ${cost===null?'Sin registrar':money2(cost)} · Ganancia: ${cost===null?'Pendiente de costo':money2(roundMoney(total-cost))}`;
    return {total,cost};
  };
  const draw=()=>{
    $('#sale-edit-items').innerHTML=items.map((item,i)=>`<fieldset class="sale-edit-item" data-sale-item="${i}"><legend>Producto ${i+1}</legend><div class="g">
      <label>Nombre<input data-field="name" maxlength="250" required value="${esc(item.name)}"></label>
      <label>Cantidad<input data-field="qty" type="number" min="1" step="1" required value="${item.qty}"></label>
      <label>Precio unitario (AR$)<input data-field="unitPrice" type="number" min="0" step="any" required value="${item.priceUnknown?'':item.unitPrice}"></label>
      <label>Costo unitario (AR$), opcional<input data-field="unitCost" type="number" min="0" step="any" value="${item.unitCost ?? ''}" placeholder="Sin registrar"></label></div><button type="button" class="s2" data-sale-remove="${i}">Quitar ítem</button></fieldset>`).join('');
    root.querySelectorAll('[data-field]').forEach(input=>input.oninput=()=>{
      const item=items[Number(input.closest('[data-sale-item]').dataset.saleItem)],key=input.dataset.field;
      item[key]=key==='name'?input.value:key==='unitCost' && input.value===''?null:Number(input.value);
      if(key==='unitPrice')delete item.priceUnknown;
      item.subtotal=roundMoney(item.qty*item.unitPrice);totals();
    });
    root.querySelectorAll('[data-sale-remove]').forEach(b=>b.onclick=()=>{items.splice(Number(b.dataset.saleRemove),1);draw();});totals();
  };
  $('#sale-edit-add').onclick=()=>{
    const value=$('#sale-edit-product').value,p=value===''?null:products[Number(value)];
    items.push(snapshotItem(p,1,knownNumber(p?.price) ?? 0,p?.name || 'Producto manual'));draw();
  };
  $('#sale-edit-cancel').onclick=()=>{root.innerHTML='';};
  form.onsubmit=async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const f=form.elements,{total,cost}=totals();
    if(!f.title.value.trim() || !orderDateValid(f.date.value))return toast('Revisá el nombre y la fecha de la venta.');
    if(!items.length || items.some(i=>!i.name.trim() || !validItem({...i,subtotal:roundMoney(i.qty*i.unitPrice)}) || (i.unitCost!==null && knownNumber(i.unitCost)===null)) || !Number.isSafeInteger(Math.round(total*100)) || (cost!==null && !Number.isSafeInteger(Math.round(cost*100))))return toast('Revisá productos, cantidades, precios y costos. La venta necesita al menos un ítem.');
    const updated={...original,settlement:f.settlement.value,client:f.client.value.trim(),date:f.date.value,name:f.title.value.trim(),items:items.map(i=>({...i,name:i.name.trim(),subtotal:roundMoney(i.qty*i.unitPrice)})),qty:items.reduce((n,i)=>n+i.qty,0),total,cost,updatedAt:new Date().toISOString()};
    await commerceChange(next=>{next.sales[index]=updated;},'Venta actualizada',sales);
  };
  draw();root.scrollIntoView({behavior:'smooth',block:'start'});form.elements.client.focus();
}
