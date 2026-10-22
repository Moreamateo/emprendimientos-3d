const EXPENSE_CATEGORIES=['Filamento','Insumos','Electricidad','Mantenimiento','Herramientas','Envíos','Servicios','Otros'];
let expenseFilters={search:'',month:'',category:''};
const expenseAmount=e=>knownNumber(e.amount) ?? 0;
const expenseDeducts=e=>e.includedInSaleCost!==true;
function expenses(){
  const rows=get('expenses');
  const categories=[...new Set([...EXPENSE_CATEGORIES,...rows.map(e=>e.category || 'Otros')])];
  $('#m').innerHTML=`<section id="expenses-ui"><h2>Gastos</h2><p class="s">Registrá pagos realizados del taller. Gastos fijos sigue siendo la configuración de la calculadora.</p>
    <button class="p" id="expense-new">+ Nuevo gasto</button><div id="expense-editor"></div>
    <div class="card g" style="margin-top:20px"><label>Buscar<input id="expense-search" type="search" value="${esc(expenseFilters.search)}" placeholder="Concepto, proveedor o nota"></label>
    <label>Mes<input id="expense-month" type="month" value="${esc(expenseFilters.month)}"></label>
    <label>Categoría<select id="expense-category"><option value="">Todas</option>${categories.map(c=>`<option ${expenseFilters.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label><button class="s2" id="expense-clear">Limpiar filtros</button></div>
    <p id="expense-summary" aria-live="polite"></p><div id="expense-list" class="expense-grid"></div></section>`;
  const draw=()=>{
    const query=expenseFilters.search.toLocaleLowerCase('es');
    const list=rows.map((e,index)=>({e,index})).filter(({e})=>(!expenseFilters.month || (e.date || '').startsWith(expenseFilters.month)) && (!expenseFilters.category || (e.category || 'Otros')===expenseFilters.category) && [e.description,e.payee,e.notes].join(' ').toLocaleLowerCase('es').includes(query)).sort((a,b)=>String(b.e.date || '').localeCompare(String(a.e.date || '')));
    const total=roundMoney(list.reduce((n,{e})=>n+expenseAmount(e),0)),deduct=roundMoney(list.reduce((n,{e})=>n+(expenseDeducts(e)?expenseAmount(e):0),0));
    $('#expense-summary').textContent=`${list.length} gastos · Pagado: ${money2(total)} · A descontar del resultado: ${money2(deduct)}`;
    $('#expense-list').innerHTML=list.map(({e,index})=>`<article class="card"><h3>${esc(e.description || 'Gasto sin concepto')}</h3><p>${orderDateLabel(e.date)} · ${esc(e.category || 'Otros')}</p><p>${esc(e.payee || 'Sin proveedor')}</p><strong>${money2(expenseAmount(e))}</strong><p class="s">${expenseDeducts(e)?'Se descuenta en Estadísticas':'Ya incluido en costos de ventas: no se descuenta otra vez'}</p>${e.notes?`<p class="order-notes">${esc(e.notes)}</p>`:''}<div class="order-actions"><button class="s2" data-expense-edit="${index}">Editar gasto</button><button class="danger" data-expense-delete="${index}">Eliminar gasto</button></div></article>`).join('') || '<p class="card">No hay gastos para mostrar.</p>';
    document.querySelectorAll('[data-expense-edit]').forEach(b=>b.onclick=()=>expenseEditor(Number(b.dataset.expenseEdit)));
    document.querySelectorAll('[data-expense-delete]').forEach(b=>b.onclick=()=>deleteExpense(Number(b.dataset.expenseDelete)));
  };
  $('#expense-new').onclick=()=>expenseEditor();
  $('#expense-search').oninput=e=>{expenseFilters.search=e.target.value;draw();};
  $('#expense-month').onchange=e=>{expenseFilters.month=e.target.value;draw();};
  $('#expense-category').onchange=e=>{expenseFilters.category=e.target.value;draw();};
  $('#expense-clear').onclick=()=>{expenseFilters={search:'',month:'',category:''};expenses();};draw();
}
function expenseEditor(index){
  const original=index===undefined?null:get('expenses')[index];
  const categories=[...new Set([...EXPENSE_CATEGORIES,original?.category || 'Otros'])];
  $('#expense-editor').innerHTML=`<form class="card" id="expense-form" style="margin-top:20px"><h3>${original?'Editar gasto':'Nuevo gasto'}</h3><div class="g">
    <label>Concepto<input name="description" required maxlength="250" value="${esc(original?.description || '')}" placeholder="Ej.: mantenimiento de impresora"></label>
    <label>Fecha de pago<input name="date" required type="date" value="${esc(original?.date || localDate())}"></label>
    <label>Importe (AR$)<input name="amount" required type="number" min="0.01" step="0.01" value="${original?expenseAmount(original):''}"></label>
    <label>Categoría<select name="category">${categories.map(c=>`<option ${c===(original?.category || 'Otros')?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
    <label>Proveedor / destinatario (opcional)<input name="payee" maxlength="250" value="${esc(original?.payee || '')}"></label></div>
    <label class="expense-check"><input name="included" type="checkbox" ${original?.includedInSaleCost?'checked':''}> Ya incluido en el costo de ventas (no descontar nuevamente)</label>
    <p class="s">Marcá esta opción si ese importe ya está contemplado en los costos de tus ventas. El pago queda registrado sin restarse dos veces. Registrar un gasto no cambia las cantidades del stock.</p>
    <label>Observaciones<textarea name="notes" rows="3" maxlength="4000">${esc(original?.notes || '')}</textarea></label>
    <div class="order-actions"><button class="p" type="submit">Guardar gasto</button><button class="s2" type="button" id="expense-cancel">Cancelar</button></div></form>`;
  const form=$('#expense-form');$('#expense-cancel').onclick=()=>{$('#expense-editor').innerHTML='';};
  form.onsubmit=async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const f=form.elements,amount=Number(f.amount.value),description=f.description.value.trim();
    if(!description || !orderDateValid(f.date.value) || !Number.isFinite(amount) || amount<=0 || !Number.isSafeInteger(Math.round(amount*100)))return toast('Revisá el concepto, la fecha y el importe del gasto.');
    const row={...(original || {}),id:original?.id || crypto.randomUUID(),description,date:f.date.value,amount:roundMoney(amount),category:f.category.value,payee:f.payee.value.trim(),notes:f.notes.value.trim(),includedInSaleCost:f.included.checked,updatedAt:new Date().toISOString()};
    await commerceChange(next=>{if(original)next.expenses[index]=row;else next.expenses.push(row);},'Gasto guardado',expenses);
  };
  form.scrollIntoView({behavior:'smooth',block:'start'});form.elements.description.focus();
}
async function deleteExpense(index){
  if(commerceBusy || !get('expenses')[index])return;
  if(!confirm('¿Eliminar este gasto? Se actualizará el resultado en Estadísticas.'))return;
  await commerceChange(next=>next.expenses.splice(index,1),'Gasto eliminado',expenses);
}
