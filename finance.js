/* Pure accounting: all totals are accumulated in integer centavos. */
(function(root){
  const cents=value=>{
    if(value===null || value===undefined || value==='')return null;
    const n=Number(value),c=Math.round(n*100);
    return Number.isFinite(n) && n>=0 && Number.isSafeInteger(c)?c:null;
  };
  const kinds={
    sales:{sale:'Venta'},
    incomes:{operating:'Ingreso por actividad',interest:'Rendimiento bancario',loan:'Préstamo recibido',contribution:'Aporte de capital',opening:'Saldo inicial',work:'Trabajo que cancela deuda'},
    expenses:{operating:'Gasto del período',inventory:'Compra de stock',repayment:'Devolución de préstamo',withdrawal:'Retiro personal',included:'Pago ya incluido en costos de ventas'}
  };
  const accounts={bank:'Banco / transferencia',cash:'Efectivo',debt:'Compensación de deuda',pending:'Pendiente de cobro'};
  function summarize(data){
    const out={sales:0,cost:0,operating:0,extra:0,bank:0,cash:0,debt:0,inventory:0,missingCosts:0,missingCostSales:0,unclassified:0,monthly:{}};
    for(const group of ['sales','incomes','expenses'])for(const row of data[group] || []){
      const amount=cents(group==='sales'?row.total:row.amount);
      const kind=group==='sales'?'sale':row.financeKind;
      const account=kind==='work'?'debt':row.settlement;
      const validKind=!!kinds[group][kind],validAccount=!!accounts[account] && (group==='sales' || (kind==='work'?account==='debt':['bank','cash'].includes(account)));
      if(amount===null || !validKind || !validAccount)out.unclassified++;
      const a=amount ?? 0, month=(row.date || '').slice(0,7) || 'Sin fecha';
      const m=out.monthly[month] ||= {revenue:0,cost:0};
      const sale=group==='sales' || kind==='work';
      if(sale){
        out.sales+=a;m.revenue+=a;
        const cost=cents(row.cost);
        if(cost===null){out.missingCosts++;out.missingCostSales+=a;}
        else {out.cost+=cost;m.cost+=cost;}
        if(account==='debt')out.debt-=a;
      }
      if(group==='incomes'){
        if(kind==='loan')out.debt+=a;
        if(['operating','interest'].includes(kind)){out.extra+=a;m.revenue+=a;}
      }
      if(group==='expenses'){
        if(kind==='repayment')out.debt-=a;
        if(kind==='inventory')out.inventory+=a;
        // The existing checkbox remains authoritative for an operating payment.
        if(kind==='operating' && row.includedInSaleCost!==true){out.operating+=a;m.cost+=a;}
      }
      if(validKind && validAccount && ['bank','cash'].includes(account))out[account]+=(group==='expenses'?-a:a);
    }
    out.salesMargin=out.sales-out.cost;
    out.profit=out.salesMargin+out.extra-out.operating;
    out.provisional=out.missingCosts>0 || out.unclassified>0;
    out.stockValue=(data.stock || []).reduce((n,r)=>{
      const grams=Number(r.grams ?? Number(r.kg)*1000),total=Number(r.total || 1000),price=cents(r.price);
      return n+(Number.isFinite(grams) && grams>=0 && total>0 && price!==null?Math.round(price*grams/total):0);
    },0);
    return out;
  }
  root.MaRoMaFinance={cents,kinds,accounts,summarize};
  if(typeof module!=='undefined')module.exports=root.MaRoMaFinance;
})(typeof globalThis!=='undefined'?globalThis:this);
