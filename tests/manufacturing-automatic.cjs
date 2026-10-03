const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const c=vm.createContext({categoryForm(){},productForm(){},fragForm(){}});vm.runInContext(fs.readFileSync(__dirname+'/../public/manufacturing.js','utf8'),c);const run=s=>vm.runInContext(s,c);
run("let p={name:'Vela Tríada',capacity_cc:200,category_id:'c'};let t={data:Mfg.preset('candle'),revision:2};let d=Mfg.newRecipe(t,p);d.measures.external_height_cm=10");
assert.equal(run("d.lines.find(l=>l.key==='wick').quantity"),3);assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='wick').total"),30);assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='tab').total"),3);
assert.equal(run("Mfg.totals(d).wax"),170);assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='fragrance').total"),8.5);assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='catalyst').total"),4.25);
run("d.lines.find(l=>l.key==='wick').quantity=2");assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='tab').total"),2);
run("d.measures.wax_override_g=1000");assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='fragrance').total"),50);assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='catalyst').total"),25);
assert.equal(run("Mfg.newRecipe(t,{...p,name:'Vela Classic'}).lines.find(l=>l.key==='wick').quantity"),1);
for(const [kind,alcohol,essence] of [['diffuser',210,40],['spray',235,15]]){run(`d=Mfg.newRecipe({data:Mfg.preset('${kind}'),revision:2},{...p,capacity_cc:250})`);assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='base').total"),alcohol);assert.equal(run("Mfg.totals(d).rows.find(l=>l.key==='fragrance').total"),essence);}
assert.equal(run("Mfg.purchaseAmount(1300,'ml',{unit:'l',pack_size:1}).packs"),2);assert.equal(run("Mfg.purchaseAmount(1000,'ml',{unit:'kg',density_g_ml:.81}).amount"),.81);assert.equal(run("Mfg.purchaseAmount(100,'ml',{unit:'g',density_g_ml:.9}).amount"),90);assert.equal(run("Mfg.purchaseAmount(30,'cm',{unit:'m'}).amount"),.3);assert.equal(run("Mfg.purchaseAmount(2,'unit',{unit:'l',density_g_ml:.9})"),null);
console.log('PASS: category doses, capacity, wax override, Triada/default/editable wicks, tabs, diffuser/spray, purchase conversion and rounding');
