const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const input={dataset:{},value:'9'},help={};
const ctx=vm.createContext({window:{afPrice:input},afPrice:input,afPriceHelp:help,gridMsg:{},document:{documentElement:{},addEventListener(){}},MutationObserver:class{observe(){}}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../public/admin-tools.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run("adminCache.products=[{id:'a',sku:'HS-NA-250-N-01-TR',price:18000},{id:'b',sku:'HO-CE-000-N-01-BL',price:20000}];productSkuFromForm=()=> 'HS-NA-250-N-01-ZZ'");
run('refreshProductPrice()');assert.equal(input.value,18000);assert.equal(input.readOnly,true);
input.dataset={productId:'a',sourceGeneric:'HS-NA-250-N-01'};input.value='18500';
run('refreshProductPrice()');assert.equal(input.readOnly,false);assert.equal(input.value,'18500');
run("productSkuFromForm=()=> 'HO-CE-000-N-01-ZZ';refreshProductPrice()");assert.equal(input.value,20000);assert.equal(input.readOnly,true);
run("productSkuFromForm=()=> 'QA-CE-000-N-99-ZZ';refreshProductPrice()");assert.equal(input.readOnly,false);
run("adminCache.products.push({id:'c',sku:'HS-NA-250-N-01-AM',price:19000})");
// Inconsistent prices must not become a blank exported price.
const exportName=fs.readFileSync(require('node:path').join(__dirname,'../public/admin-tools.js'),'utf8').match(/function (\w+)\(\)\{\s*let groups=priceGenericGroups\(\);if/)[1];
run(exportName+'()');assert.match(ctx.gridMsg.textContent,/inconsistentes/);
console.log('PASS: new color inheritance UI, existing generic price edit, move inheritance, new generic input, inconsistent export blocked');
