const {test}=require('node:test');
const assert=require('node:assert/strict');
const {summarize}=require('./finance.js');
const fixture=()=>({sales:[{total:51800,cost:22312.58,settlement:'bank'},{total:6000,cost:null,settlement:'bank'}],incomes:[{amount:38000,financeKind:'loan',settlement:'bank'},{amount:10.15,financeKind:'interest',settlement:'bank'}],expenses:[{amount:67500,financeKind:'inventory',settlement:'bank'}]});
test('conciliación: banco, margen provisional y costo desconocido',()=>{
  const v=summarize(fixture());
  assert.equal(v.bank,2831015);assert.equal(v.sales,5780000);
  assert.equal(v.salesMargin,3548742);assert.equal(v.profit,3549757);
  assert.equal(v.cost,2231258);assert.equal(v.missingCosts,1);
  assert.equal(v.missingCostSales,600000);assert.equal(v.provisional,true);
  assert.equal(v.unclassified,0);assert.equal(v.debt,3800000);
});
test('regla compensada como venta: reduce deuda, nunca banco',()=>{
  const d=fixture();d.sales.push({total:3000,cost:null,settlement:'debt'});
  const v=summarize(d);assert.equal(v.bank,2831015);assert.equal(v.debt,3500000);
  assert.equal(v.sales,6080000);assert.equal(v.missingCosts,2);
});
test('regla ya existente en ingresos: reclasificar sin crear otra venta',()=>{
  const d=fixture();d.incomes.push({amount:3000,financeKind:'work',settlement:'bank',cost:1000});
  const v=summarize(d);assert.equal(v.bank,2831015);assert.equal(v.debt,3500000);
  assert.equal(v.sales,6080000);assert.equal(v.cost,2331258);
});
test('capital, saldo inicial y devolución no alteran ganancias',()=>{
  const d=fixture();d.incomes.push({amount:100,financeKind:'opening',settlement:'bank'},{amount:200,financeKind:'contribution',settlement:'cash'});
  d.expenses.push({amount:1000,financeKind:'repayment',settlement:'bank'});
  const v=summarize(d);assert.equal(v.profit,summarize(fixture()).profit);assert.equal(v.debt,3700000);assert.equal(v.cash,20000);assert.equal(v.bank,2741015);
});
test('pago incluido y stock no duplican costos; gasto operativo sí',()=>{
  const d=fixture();d.expenses.push({amount:100,financeKind:'included',settlement:'bank'},{amount:200,financeKind:'operating',includedInSaleCost:true,settlement:'bank'},{amount:300,financeKind:'operating',settlement:'bank'});
  const v=summarize(d);assert.equal(v.operating,30000);assert.equal(v.profit,3519757);
});
test('historial sin clasificar permanece intacto y banco se marca parcial',()=>{
  const d={sales:[{total:6000,cost:null}],incomes:[{amount:38000}],expenses:[{amount:67500}],stock:[{grams:500,total:1000,price:10000}]};
  const before=JSON.stringify(d),v=summarize(d);
  assert.equal(JSON.stringify(d),before);assert.equal(v.unclassified,3);assert.equal(v.bank,0);assert.equal(v.stockValue,500000);
});
test('venta pendiente y efectivo no son transferencia; costo cero explícito válido',()=>{
  const v=summarize({sales:[{total:1,cost:0,settlement:'pending'},{total:0.1,cost:0,settlement:'cash'},{total:0.2,cost:0,settlement:'cash'}]});
  assert.equal(v.bank,0);assert.equal(v.cash,30);assert.equal(v.salesMargin,130);assert.equal(v.provisional,false);
});
test('editar o eliminar cambia el cálculo una sola vez',()=>{
  const d=fixture();d.incomes[0].amount=40000;assert.equal(summarize(d).debt,4000000);
  d.incomes.shift();assert.equal(summarize(d).debt,0);assert.equal(summarize(d).bank,-968985);
});
