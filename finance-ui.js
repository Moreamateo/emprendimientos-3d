function financeOptions(options,value,blank=true){
  return (blank?'<option value="">Sin clasificar</option>':'')+Object.entries(options).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${esc(v)}</option>`).join('');
}
function financeFields(group,row={}){
  return `<div class="g">${group==='sales'?'':`<label>Tipo de movimiento<select name="financeKind" required>${financeOptions(MaRoMaFinance.kinds[group],row.financeKind)}</select></label>`}
    <label>Medio de cobro / pago<select name="settlement" required>${financeOptions(group==='sales'?MaRoMaFinance.accounts:{bank:'Banco / transferencia',cash:'Efectivo'},row.settlement)}</select></label></div>
    <p class="s">Los préstamos y aportes no son ganancias. Comprar stock mueve dinero; su costo se reconoce al vender. Para un trabajo que cancela deuda, el medio de cobro se ignora y no se mueve dinero.</p>`;
}
function stats(){
  const v=MaRoMaFinance.summarize(D),fmt=c=>money2(c/100);
  const now=new Date(),months=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return {label:d.toLocaleDateString('es-AR',{month:'short',year:'2-digit'}),...(v.monthly[key] || {revenue:0,cost:0})};
  }),max=Math.max(1,...months.flatMap(m=>[m.revenue,m.cost]));
  $('#m').innerHTML=`<h2>Ventas, resultado y dinero</h2>
    <p class="s">El resultado no es efectivo disponible. Banco y deuda se calculan con los movimientos clasificados de todo el historial.</p>
    <div class="card g">
      <div class="k">${fmt(v.sales)}<small>Total vendido, incluye trabajos compensados</small></div>
      <div class="k" id="stats-result">${fmt(v.profit)}<small>${v.provisional?'Resultado provisional':'Resultado según costos registrados'}</small></div>
      <div class="k">${fmt(v.bank)}<small>${v.unclassified?'Banco parcial: falta clasificar':'Saldo bancario calculado'}</small></div>
      <div class="k">${fmt(v.debt)}<small>Deuda neta registrada ${v.debt<0?'(revisar: cancelaciones mayores al préstamo)':''}</small></div>
    </div>
    <div class="card"><h3>Qué falta para cerrar el resultado</h3>
      <p>${v.missingCosts} ventas/trabajos sin costo, por ${fmt(v.missingCostSales)}. Sus costos no se consideran cero: el resultado queda provisional.</p>
      <p>${v.unclassified} movimientos sin clasificación completa o importe válido. Revisalos abajo para calcular banco y deuda correctamente.</p>
      <p>Costos conocidos: <strong>${fmt(v.cost)}</strong> · Margen de ventas ${v.provisional?'provisional':''}: <strong>${fmt(v.salesMargin)}</strong> · Gastos del período: ${fmt(v.operating)} · Otros ingresos de actividad y rendimientos: ${fmt(v.extra)}.</p>
      <p>Compras de stock pagadas: ${fmt(v.inventory)} · Stock disponible valorizado (estimado): ${fmt(v.stockValue)} · Efectivo registrado: ${fmt(v.cash)}.</p>
      <p class="s">El saldo calculado requiere todo el historial y, si corresponde, un saldo inicial. No consulta tu banco. Las cantidades de stock se ajustan en Stock; el consumo incluido en el costo de una venta no se resta otra vez.</p>
    </div>
    <div class="card chart-card"><h3>Últimos 6 meses</h3><div class="legend"><span><i class="ing"></i> Ingresos de actividad</span><span><i class="gas"></i> Costos conocidos + gastos</span></div><div class="chart-bars">${months.map(m=>`<div class="chart-col"><div class="chart-bar-group"><div class="chart-bar ing" style="height:${m.revenue/max*100}%"></div><div class="chart-bar gas" style="height:${m.cost/max*100}%"></div></div><div class="chart-label">${esc(m.label)}</div></div>`).join('')}</div></div>
    <div class="card"><h3>Resultado por mes</h3>${Object.entries(v.monthly).sort(([a],[b])=>b.localeCompare(a)).map(([m,t])=>`<p>${esc(m)} · Ingresos de actividad ${fmt(t.revenue)} · Costos conocidos y gastos ${fmt(t.cost)} · Resultado ${fmt(t.revenue-t.cost)}${v.provisional?' (provisional)':''}</p>`).join('') || '<p>Sin movimientos.</p>'}</div>
    <div class="card"><h3>Conciliar registros existentes</h3><p>Clasificá cada registro una sola vez. Si un préstamo o una compra ya aparece en Gastos e ingresos, editá ese registro; no crees otro. Para registrar nuevos préstamos, rendimientos o devoluciones usá Gastos e ingresos. Las ventas se registran en Ventas.</p><div id="finance-editor"></div>
    ${['sales','incomes','expenses'].map(group=>`<h3>${{sales:'Ventas',incomes:'Ingresos',expenses:'Pagos'}[group]}</h3>${get(group).map((r,i)=>`<p>${esc(r.date || 'Sin fecha')} · ${esc(r.name || r.description || r.desc || 'Sin concepto')} · ${money2(Number(group==='sales'?r.total:r.amount)||0)} · ${esc(MaRoMaFinance.kinds[group][group==='sales'?'sale':r.financeKind] || 'Sin clasificar')} · ${esc(MaRoMaFinance.accounts[r.financeKind==='work'?'debt':r.settlement] || 'Medio sin clasificar')} <button class="s2" data-finance-group="${group}" data-finance-index="${i}">Clasificar</button></p>`).join('')}`).join('')}</div>`;
  document.querySelectorAll('[data-finance-group]').forEach(b=>b.onclick=()=>editFinance(b.dataset.financeGroup,Number(b.dataset.financeIndex)));
}
function stockMovementHistory(){
  return `<details class="card"><summary>Historial de movimientos de stock</summary>${get('stockMovements').slice().reverse().map(r=>`<p>${esc(r.date)} · ${esc(get('stock').find(s=>s.id===r.stockId)?.name || 'Material retirado')} · ${esc({opening:'Alta de stock existente',purchase:'Compra',adjustment:'Ajuste de peso',remove:'Baja'}[r.kind] || r.kind)} · ${esc(r.grams)} g</p>`).join('') || '<p>Sin movimientos registrados desde esta actualización.</p>'}</details>`;
}
function editFinance(group,index){
  const row=get(group)[index],root=$('#finance-editor');
  root.innerHTML=`<form id="finance-form" class="card"><h3>Clasificar: ${esc(row.name || row.description || row.desc || 'Movimiento')}</h3>${financeFields(group,row)}
  ${group==='incomes'?`<label>Costo del trabajo compensado (opcional)<input name="workCost" type="number" min="0" step="0.01" value="${esc(row.cost ?? '')}" placeholder="Sin registrar"></label>`:''}
  <button class="p">Guardar clasificación</button><button class="s2" type="button" id="finance-cancel">Cancelar</button></form>`;
  $('#finance-cancel').onclick=()=>root.innerHTML='';
  $('#finance-form').onsubmit=async e=>{
    e.preventDefault();const f=e.currentTarget.elements;
    await commerceChange(next=>{
      const target=next[group][index];target.settlement=f.settlement.value;
      if(group!=='sales')target.financeKind=f.financeKind.value;
      if(group==='incomes' && target.financeKind==='work')target.cost=knownNumber(f.workCost.value);
    },'Clasificación guardada',stats);
  };
  root.scrollIntoView({behavior:'smooth'});
}
