/* Inventory adjustments and the expense are committed together by commerceChange. */
(function(root){
  const weight=r=>Number(r.grams ?? Number(r.kg || 0)*1000);
  function apply(data,previous,row,{uuid,date}={uuid:()=>crypto.randomUUID(),date:()=>localDate()}){
    const old=previous?.financeKind==='production_loss'?previous.waste:null;
    const current=row?.financeKind==='production_loss'?row.waste:null;
    if(current && (!Number.isSafeInteger(current.grams) || current.grams<=0 || !current.stockId))throw Error('Elegí el material y una cantidad válida de gramos desperdiciados.');
    if(row?.financeKind==='production_loss'){row.settlement='none';row.includedInSaleCost=false;}
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
  return `<div id="loss-fields" hidden>
    <label class="expense-check"><input name="wasteAdjusted" type="checkbox" ${original?.stockWeightAdjusted?'checked':''}> Ya ajusté el peso del stock</label>
    <p class="s">La pérdida descuenta el importe de la ganancia, sin mover banco ni efectivo. El importe es el costo perdido, no el precio de venta. No lo incluyas otra vez en el costo de una venta. Si ya ajustaste el peso, marcá la opción para evitar otro descuento.</p>
    <p class="s">Solo necesitás conocer el costo: no se piden gramos ni se modifica el stock al registrar esta pérdida. La opción deja constancia del ajuste manual.</p>
    ${original?.waste?'<p class="s">Se conserva el movimiento de material registrado anteriormente; editar el importe no vuelve a descontar stock.</p>':''}</div>`;
}
function bindLossFields(form){
  const f=form.elements;
  const toggle=()=>{
    const loss=f.financeKind.value==='production_loss';
    form.querySelector('#loss-fields').hidden=!loss;
    f.wasteAdjusted.disabled=!loss;
    f.settlement.disabled=loss;f.settlement.required=!loss;
    if(loss){f.settlement.value='none';f.included.checked=false;}
    else if(f.settlement.value==='none')f.settlement.value='';
    f.included.disabled=loss;
  };
  f.financeKind.addEventListener('change',toggle);toggle();
}
function saveExpenseWithLoss(next,original,row,alreadyAdjusted){
  if(row.financeKind==='production_loss')row.stockWeightAdjusted=alreadyAdjusted;
  // Keep legacy waste snapshots intact; new losses are amount-only.
  MaRoMaLoss.apply(next,original,row);
}
