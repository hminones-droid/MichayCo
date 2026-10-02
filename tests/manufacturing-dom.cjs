const {parseHTML}=require('linkedom');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {window,document}=parseHTML('<html><body><section id="catalogWorkspace"></section></body></html>');
const source=fs.readFileSync(__dirname+'/../public/admin-tools.js','utf8');
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return [...this.querySelectorAll('option')].find(x=>x.hasAttribute('selected'))?.value||this.querySelector('option')?.value||''},set(v){this.querySelectorAll('option').forEach(x=>{if(x.value===v)x.setAttribute('selected','');else x.removeAttribute('selected')})}});
Object.defineProperty(window.HTMLSelectElement.prototype,'selectedIndex',{get(){return [...this.options].findIndex(x=>x.value===this.value)}});
Object.defineProperty(window.HTMLInputElement.prototype,'checked',{get(){return this.hasAttribute('checked')},set(v){v?this.setAttribute('checked',''):this.removeAttribute('checked')}});
const memory={},context={document,console,Event:window.Event,MutationObserver:window.MutationObserver,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,mountArticlePhotos(){},location:{},confirm:()=>true};
context.window=context;for(const id of new Set([...source.matchAll(/id="([\w-]+)"/g)].map(x=>x[1])))Object.defineProperty(context,id,{get:()=>document.getElementById(id),configurable:true});
context.sb={from(table){let op='read',payload,filters={};const api={select(){return api},eq(k,v){filters[k]=v;return api},insert(d){op='insert';payload=d;return api},update(d){op='update';payload=d;return api},async maybeSingle(){return api.single()},async single(){let old=memory[table];if(op==='read')return {data:old||null};if(op==='update'&&old?.revision!==filters.revision)return {data:null};const data={...old,...payload,revision:(old?.revision||0)+1};memory[table]=data;return {data}}};return api}};
vm.createContext(context);vm.runInContext(source,context);vm.runInContext(fs.readFileSync(__dirname+'/../public/manufacturing.js','utf8'),context);
const run=s=>vm.runInContext(s,context),tick=()=>new Promise(r=>setImmediate(r)),q=s=>document.querySelector(s);
(async()=>{
run("adminCache.categories=[{id:'c1',name:'Velas Soja',code:'VS'}];adminCache.products=[{id:'p1',name:'Vela',category_id:'c1',capacity_cc:200,sku:'VS-CR-200-N-01-BL',material:'Cristal',color:'Blanco',version_code:'01',price:100}];adminCache.materials=[{name:'Cristal',code:'CR'}];adminCache.colors=[{name:'Blanco',code:'BL'}];adminCache.fragrances=[{id:'f1',name:'Prueba',code:'PR'}];categoryForm('c1')");await tick();
assert.equal(document.querySelectorAll('[data-line]').length,10);await q('[data-save]').onclick();assert.equal(memory.category_manufacturing_templates.revision,1);
run("productForm('p1')");await tick();assert.equal(document.querySelectorAll('[data-recipe-line]').length,10);q('[data-status]').value='ready';await q('[data-save]').onclick();assert.match(q('[data-msg]').textContent,/Falta/);q('[data-status]').value='draft';await q('[data-save]').onclick();assert.equal(memory.product_manufacturing_recipes.revision,1);
run("fragForm('f1')");await tick();let rows=document.querySelectorAll('[data-blend]');rows[0].querySelector('[data-name]').value='A';rows[0].querySelector('[data-percent]').value='70';rows[1].querySelector('[data-name]').value='B';rows[1].querySelector('[data-percent]').value='30';q('[data-status]').value='ready';await q('[data-save]').onclick();assert.equal(memory.fragrance_compositions.revision,1);assert.equal(memory.fragrance_compositions.data.lines.length,2);
// Stale edit rejected without replacing existing content.
memory.fragrance_compositions={...memory.fragrance_compositions,revision:2};rows[0].querySelector('[data-percent]').value='60';rows[1].querySelector('[data-percent]').value='40';await q('[data-save]').onclick();assert.match(q('[data-msg]').textContent,/otra sesión/);assert.equal(memory.fragrance_compositions.data.lines[0].percent,70);
console.log('PASS: real form DOM, category save, inheritance, draft/ready, blend save, stale edit rejection (mock API; not visual QA)');
})().catch(e=>{console.error(e);process.exit(1)});
