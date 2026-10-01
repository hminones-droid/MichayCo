const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx=vm.createContext({document:{documentElement:{},addEventListener(){}},MutationObserver:class{observe(){}}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../public/admin-tools.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run("suggestCatalogCode('Cerámica',[])"),'CE');
assert.notEqual(run("suggestCatalogCode('Cerámica',[{code:'CE'}])"),'CE');
assert.equal(run("suggestCatalogCode('',[])"),'');
assert.notEqual(run("suggestCatalogCode('Naranja Azahar',[],['NA'])"),'NA');
assert.match(run("catalogValidation(' ceramica  ','CX',[{id:'1',name:'Cerámica',code:'CE'}],null)"),/Ya existe/);
assert.equal(run("catalogValidation('Cerámica','CE',[{id:'1',name:'Cerámica',code:'CE'}],'1')"),'');
assert.match(run("catalogValidation('Lavanda','NA',[],null,['NA'])"),/reservado/);
assert.match(run("catalogValidation('Lavanda','LA',[{id:'1',name:'Lago',code:'LA'}],null)"),/en uso/);
const events={},codeEvents={};ctx.inputName={value:'Cerámica',addEventListener:(event,fn)=>events[event]=fn};ctx.inputCode={value:'',addEventListener:(event,fn)=>codeEvents[event]=fn};
run('bindCodeSuggestion(inputName,inputCode,[],null)');events.input();assert.equal(ctx.inputCode.value,'CE');ctx.inputCode.value='ZZ';codeEvents.input();ctx.inputName.value='Madera';events.input();assert.equal(ctx.inputCode.value,'ZZ');
async function test(){let calls=0,resolve;ctx.msg={textContent:'',setAttribute(){}};ctx.button={disabled:false,textContent:'Guardar',onclick:()=>{calls++;return new Promise(r=>resolve=r)}};run('guardCatalogSave(button,msg)');let first=ctx.button.onclick();await ctx.button.onclick();assert.equal(calls,1);assert.equal(ctx.button.disabled,true);resolve();await first;assert.equal(ctx.button.disabled,false);assert.equal(ctx.button.textContent,'Guardar');console.log('PASS: suggestions, collisions, reserved code, normalized duplicates, existing edits, manual code preservation, double-click guard');}
test().catch(e=>{console.error(e);process.exitCode=1});
