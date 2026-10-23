const {test}=require('node:test'),assert=require('node:assert/strict');
const {summarize}=require('./finance.js'),{apply}=require('./production-loss.js');
const options={uuid:()=>String(Math.random()),date:()=> '2026-10-23'};
const fixture=()=>({stock:[{id:'p',grams:1000,total:1000,kg:1,price:20000}],stockMovements:[],sales:[{total:30000,cost:5000,settlement:'bank'}],expenses:[{amount:20000,financeKind:'inventory',settlement:'bank'}]});
const loss=(grams=100)=>({id:'loss',amount:2000,financeKind:'production_loss',settlement:'bank',date:'2026-10-23',waste:{stockId:'p',name:'PLA',grams,adjustStock:true}});
test('loss lowers profit and monthly result once, never bank/cash/debt or inventory purchases',()=>{
 const d=fixture(),before=summarize(d),row=loss();apply(d,null,row,options);d.expenses.push(row);const v=summarize(d);
 assert.equal(v.profit,before.profit-200000);assert.equal(v.productionLoss,200000);assert.equal(v.monthly['2026-10'].cost,200000);
 for(const key of ['bank','cash','debt','inventory','cost'])assert.equal(v[key],before[key]);
 assert.equal(v.unclassified,0);assert.equal(d.stock[0].grams,900);assert.equal(d.stock[0].kg,0.9);assert.equal(d.expenses.length,2);
 // Even a historical bank/cash tag on a loss cannot generate a cash movement.
 row.settlement='cash';assert.equal(summarize(d).cash,0);
});
test('edit amount does not consume twice; edit grams applies difference; delete reverses',()=>{
 const d=fixture(),row=loss();apply(d,null,row,options);const edited={...row,amount:3000};apply(d,row,edited,options);assert.equal(d.stockMovements.length,1);assert.equal(d.stock[0].grams,900);
 const next={...edited,waste:{...edited.waste,grams:150}};apply(d,edited,next,options);assert.equal(d.stock[0].grams,850);
 apply(d,next,null,options);assert.equal(d.stock[0].grams,1000);assert.equal(d.stockMovements.reduce((n,m)=>n+m.grams,0),0);
});
test('previously adjusted material is recorded but never consumed or restored twice',()=>{
 const d=fixture(),row=loss();row.waste.adjustStock=false;apply(d,null,row,options);assert.equal(d.stock[0].grams,1000);assert.equal(d.stockMovements[0].wasteGrams,100);assert.equal(d.stockMovements[0].grams,0);
 apply(d,row,{...row,amount:2500},options);assert.equal(d.stockMovements.length,1);apply(d,row,null,options);assert.equal(d.stock[0].grams,1000);
});
test('invalid grams, missing stock and insufficient stock are rejected',()=>{
 for(const grams of [0,-1,0.5,1001,NaN]){const d=fixture();assert.throws(()=>apply(d,null,loss(grams),options));}
 const d=fixture(),row=loss();row.waste.stockId='missing';assert.throws(()=>apply(d,null,row,options));
});
test('reclassifying loss reverses physical adjustment and removes waste metadata',()=>{
 const d=fixture(),row=loss();apply(d,null,row,options);const other={...row,financeKind:'operating',settlement:'bank'};apply(d,row,other,options);assert.equal(d.stock[0].grams,1000);assert.equal(other.waste,undefined);
});
