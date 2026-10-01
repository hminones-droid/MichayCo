const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx=vm.createContext({document:{documentElement:{},addEventListener(){}},MutationObserver:class{observe(){}},gridMsg:{},saveGrid:{},uploadSheet:{},stockMode:'prices'});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../public/admin-tools.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
run("adminCache.products=[{id:'a',name:'Hornito',sku:'HO-CE-000-N-01-BL',price:200,published:true},{id:'b',name:'Hornito',sku:'HO-CE-000-N-01-VE',price:null,published:false}];");
assert.equal(run('priceGenericGroups()[0].mixedPrice'),true);
const plan=d=>{ctx.draft=d;return plain(run("priceGridUpdates(priceGenericGroups(),new Map([['HO-CE-000-N-01',draft]]))"))};
assert.deepEqual(plan({}),[]);
assert.deepEqual(plan({price:'300'}),[{id:'a',data:{price:300}},{id:'b',data:{price:300}}]);
assert.deepEqual(plan({visibility:'show'}),[{id:'b',data:{published:true}}]);
assert.deepEqual(plan({visibility:'hide'}),[{id:'a',data:{published:false}}]);
assert.deepEqual(plan({price:''}),[{id:'a',data:{price:null}}]);
for(const price of ['-1','1.234','Infinity','foo'])assert.throws(()=>plan({price}),/Precio inválido/);
const calls=[];let fail=false;
ctx.sb={rpc:async(name,args)=>{calls.push({name,args:plain(args)});return fail?{error:{message:'fallo'}}:{data:{presentations:2}}}};
run('adminLoad=async()=>{}');
run('renderMaintenanceGrid=()=>{}');
async function test(){
 await run('saveMaintenanceGrid()');assert.equal(calls.length,0);
 // Full validation before first network write.
 run("maintenancePriceDrafts.set('HO-CE-000-N-01',{price:'-1'})");
 await run('saveMaintenanceGrid()');assert.equal(calls.length,0);
 run("maintenancePriceDrafts.set('HO-CE-000-N-01',{visibility:'show'})");
 await run('saveMaintenanceGrid()');
 assert.deepEqual(calls,[{name:'save_generic_price_grid',args:{p_changes:[{sku:'HO-CE-000-N-01',published:true}]}}]);
 assert.equal(run("adminCache.products[1].price"),null);
 assert.equal(run('maintenancePriceDrafts.size'),0);
 // Pending state is used by every redraw, including filters.
 run("maintenancePriceDrafts.set('HO-CE-000-N-01',{price:'310',visibility:'hide'})");
 let html=run('renderPriceGroupRow(priceGenericGroups()[0])');
 assert.match(html,/value="310"/);assert.match(html,/value="hide" selected/);
 fail=true;await run('saveMaintenanceGrid()');
 assert.equal(run('maintenancePriceDrafts.size'),1);
 assert.equal(ctx.saveGrid.disabled,false);assert.match(ctx.gridMsg.textContent,/No se pudo confirmar/);
 console.log('PASS: no-op, inconsistent null/numeric detection, field isolation, explicit clearing, validation, save, redraw and failure retention');
}
test().catch(e=>{console.error(e);process.exitCode=1});

