const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../public/admin-tools.js'),'utf8');
const ctx=vm.createContext({console,document:{documentElement:{},addEventListener(){}},MutationObserver:class{observe(){}},gridMsg:{},uploadSheet:{},saveGrid:{},XLSX:{utils:{book_new:()=>({Sheets:{}}),json_to_sheet:rows=>rows,book_append_sheet:(wb,s,n)=>wb.Sheets[n]=s,sheet_to_json:s=>s},writeFile:wb=>ctx.book=wb,read:()=>ctx.book}});
vm.runInContext(source,ctx);
vm.runInContext(`adminCache.products=[
 {id:'a',sku:'HO-CE-000-N-01-BL',name:'Hornito',color:'Blanco',published:true,price:20000,uses_fragrance:false,stock:2},
 {id:'b',sku:'HO-CE-000-N-01-VE',name:'Hornito',color:'Verde',published:false,price:20000,uses_fragrance:false,stock:3}
]; downloadMaintenanceWorkbook();`,ctx);
assert.equal(ctx.book.Sheets.Precios[0].Mostrar,'CONSERVAR');
for(const [value,expected] of [['SI',true],['sí',true],['NO',false],['false',false],['CONSERVAR',null],['mixta',null],['',null],[undefined,null]]){
 ctx.value=value; assert.equal(vm.runInContext('importVisibility(value)',ctx),expected);
}
assert.throws(()=>vm.runInContext("importVisibility('N0')",ctx),/Mostrar debe/);
const dialogs=[],calls=[];
ctx.captureDialog=html=>{dialogs.push(html);return html.includes('¿Cómo querés aplicar')?'total':html.includes('Revisá los cambios')?'apply':'cancel'};
ctx.captureRpc=(name,payload)=>{calls.push({name,payload});return {data:{prices:1,stock:1}}};
vm.runInContext(`importDialog=async html=>captureDialog(html);adminLoad=async()=>{};renderMaintenanceGrid=()=>{};sb={rpc:async(name,payload)=>captureRpc(name,payload)};`,ctx);
async function run(){
 ctx.file={arrayBuffer:async()=>new ArrayBuffer(0)};
 await vm.runInContext('importMaintenanceWorkbook(file)',ctx);
 assert.equal(calls.length,1);
 assert.equal(calls[0].payload.p_prices[0].published,null);
 assert.ok(dialogs.some(x=>x.includes('<b>0</b><span>filas con cambios')));
 assert.ok(dialogs.some(x=>x.includes('conservar visibilidad de cada color')));
 // Explicit SI/NO still intentionally changes the group.
 for(const [value,want] of [['SI',true],['NO',false]]){
  ctx.book.Sheets.Precios[0].Mostrar=value;
  await vm.runInContext('importMaintenanceWorkbook(file)',ctx);
  assert.equal(calls.at(-1).payload.p_prices[0].published,want);
 }
 // Missing column preserves, and invalid text must never reach the RPC.
 delete ctx.book.Sheets.Precios[0].Mostrar;
 await vm.runInContext('importMaintenanceWorkbook(file)',ctx);
 assert.equal(calls.at(-1).payload.p_prices[0].published,null);
 const count=calls.length;
 ctx.book.Sheets.Precios[0].Mostrar='N0';
 await vm.runInContext('importMaintenanceWorkbook(file)',ctx);
 assert.equal(calls.length,count);
 assert.match(ctx.gridMsg.textContent,/Planilla con errores/);
 // Uniform groups keep SI and NO exports.
 vm.runInContext('adminCache.products.forEach(p=>p.published=true);downloadMaintenanceWorkbook()',ctx);
 assert.equal(ctx.book.Sheets.Precios[0].Mostrar,'SI');
 vm.runInContext('adminCache.products.forEach(p=>p.published=false);downloadMaintenanceWorkbook()',ctx);
 assert.equal(ctx.book.Sheets.Precios[0].Mostrar,'NO');
 console.log('PASS: mixed export round trip, preview, RPC payload, explicit visibility, missing column, invalid value, uniform exports');
}
run().catch(e=>{console.error(e);process.exitCode=1});
