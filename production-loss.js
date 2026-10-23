/* Inventory adjustments and the expense are committed together by commerceChange. */
(function(root){
  const weight=r=>Number(r.grams ?? Number(r.kg || 0)*1000);
  function apply(data,previous,row,{uuid,date}={uuid:()=>crypto.randomUUID(),date:()=>localDate()}){
    const old=previous?.financeKind==='production_loss'?previous.waste:null;
    const current=row?.financeKind==='production_loss'?row.waste:null;
    if(current && (!Number.isSafeInteger(current.grams) || current.grams<=0 || !current.stockId))throw Error('Elegí el material y una cantidad válida de gramos desperdiciados.');
    if(row?.financeKind==='production_loss' && !current)throw Error('Registrá el material desperdiciado.');
    const oldApplied=old && old.adjustStock===true;
    const newApplied=current && current.adjustStock===true;
    const same=oldApplied && newApplied && old.stockId===current.stockId && old.grams===current.grams;
    data.stockMovements ||= [];
    if(oldApplied && !same){
      const stock=data.stock.find(s=>s.id===old.stockId);
      if(!stock)throw Error('El material original ya no está en Stock. No se puede revertir su descuento; restaurá ese material antes de cambiar o eliminar la pérdida.');
      stock.grams=weight(stock)+old.grams;if('kg' in stock)stock.kg=stock.grams/1000;
      data.stockMovements.push({id:uuid(),stockId:stock.id,stockName:old.name,expenseId:previous.id,date:date(),kind:'loss_reversal',grams:old.grams});
    }
    if(current){
      const stock=data.stock.find(s=>s.id===current.stockId);
      if(!stock && !(old && old.stockId===current.stockId && old.grams===current.grams && old.adjustStock===current.adjustStock))throw Error('El material elegido ya no está disponible.');
      if(newApplied && !same){
        const available=weight(stock);
        if(!Number.isFinite(available)||current.grams>available)throw Error('No hay suficientes gramos disponibles para registrar esta pérdida.');
        stock.grams=available-current.grams;if('kg' in stock)stock.kg=stock.grams/1000;
        data.stockMovements.push({id:uuid(),stockId:stock.id,stockName:current.name,expenseId:row.id,date:row.date,kind:'production_loss',grams:-current.grams});
      }else if(!newApplied && (!old || old.stockId!==current.stockId || old.grams!==current.grams || old.adjustStock!==false)){
        data.stockMovements.push({id:uuid(),stockId:current.stockId,stockName:current.name,expenseId:row.id,date:row.date,kind:'loss_recorded',grams:0,wasteGrams:current.grams});
      }
      row.settlement='none';row.includedInSaleCost=false;
    }else if(row){delete row.waste;}
  }
  root.MaRoMaLoss={apply};
  if(typeof module!=='undefined')module.exports=root.MaRoMaLoss;
})(typeof globalThis!=='undefined'?globalThis:this);

function lossFields(original){
  const old=original?.waste;
  return `<div id="loss-fields" hidden><div class="g"><label>Material desperdiciado<select name="wasteStock"><option value="">Elegí el material</option>${get('stock').map((s,i)=>`<option value="${i}" ${old?.stockId===s.id?'selected':''}>${esc(s.name || 'Material')} · ${esc(s.color || '')} · ${Number(s.grams ?? (s.kg || 0)*1000)} g disponibles</option>`).join('')}${old && !get('stock').some(s=>s.id===old.stockId)?`<option value="original" selected>${esc(old.name)} (retirado del stock)</option>`:''}</select></label>
    <label>Gramos desperdiciados<input name="wasteGrams" type="number" min="1" step="1" value="${old?.grams || ''}"></label></div>
    <label class="expense-check"><input name="wasteAdjusted" type="checkbox" ${old?.adjustStock===false?'checked':''}> Ya desconté estos gramos del stock</label>
    <p class="s">La pérdida descuenta el importe de la ganancia, sin mover banco ni efectivo. El importe es el costo perdido, no el precio de venta. No lo incluyas otra vez en el costo de una venta. Si ya ajustaste el peso, marcá la opción para evitar otro descuento.</p></div>`;
}
function bindLossFields(form){
  const f=form.elements;
  const toggle=()=>{
    const loss=f.financeKind.value==='production_loss';
    form.querySelector('#loss-fields').hidden=!loss;
    for(const key of ['wasteStock','wasteGrams','wasteAdjusted'])f[key].disabled=!loss;
    f.wasteStock.required=loss;f.wasteGrams.required=loss;
    f.settlement.disabled=loss;f.settlement.required=!loss;
    if(loss){f.settlement.value='none';f.included.checked=false;}
    else if(f.settlement.value==='none')f.settlement.value='';
    f.included.disabled=loss;
  };
  f.financeKind.addEventListener('change',toggle);toggle();
}
function saveExpenseWithLoss(next,original,row,selection,grams,alreadyAdjusted){
  if(row.financeKind==='production_loss'){
    const stock=selection==='original'?null:next.stock[Number(selection)];
    if(selection==='' || (!stock && selection!=='original'))throw Error('Elegí el material desperdiciado.');
    if(stock)stock.id ||= crypto.randomUUID();
    row.waste={stockId:stock?.id || original?.waste?.stockId,name:stock?.name || original?.waste?.name || 'Material',grams,adjustStock:!alreadyAdjusted};
  }
  MaRoMaLoss.apply(next,original,row);
}
