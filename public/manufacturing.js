/* Internal manufacturing configuration. No stock writes or public recipe reads. */
const Mfg = (() => {
 const units={g:'g',ml:'ml',unit:'unidades',cm:'cm'}, bases={fixed:'Por producto',per100wax:'Por 100 g de cera',per100mass:'Por 100 g de mezcla final',per100ml:'Por 100 ml finales',wax:'Cera calculada',wick:'Altura interior + margen (anterior)',wax_capacity:'Cera según capacidad',per100wax_ml:'ml por 100 g de cera',wick_external:'Pabilos × altura exterior',same_wicks:'Una chapita por pabilo'};
 const kinds={candle:'Vela',diffuser:'Difusor',spray:'Home spray / vaporizador',custom:'Personalizado'};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const esc=x=>ae(x), num=x=>x===''||x==null?null:Number(x), fmt=x=>Number.isFinite(x)?x.toLocaleString('es-AR',{maximumFractionDigits:3}):'Pendiente';
 const option=(items,value)=>Object.entries(items).map(([k,v])=>`<option value="${esc(k)}" ${k===value?'selected':''}>${esc(v)}</option>`).join('');
 const automatic=b=>['wax','wax_capacity','same_wicks'].includes(b);
 const purchaseUnits={ml:'ml',l:'litros',g:'g',kg:'kg',cm:'cm',m:'metros',unit:'unidades'};
 function purchaseDefault(key,unit){return {unit:key==='base'?'l':unit==='g'?'kg':unit==='cm'?'m':unit,pack_size:null,density_g_ml:key==='base'?.81:.9};}
 function preset(kind){
  const line=(key,label,unit='unit',basis='fixed',required=true,name='',quantity=null)=>({key,label,unit,basis,required,default_name:name,default_quantity:quantity,purchase:purchaseDefault(key,unit)});
  let lines=kind==='candle'?[line('vessel','Envase / frasco','unit','fixed',true,'',1),line('wax','Cera de soja','g','wax_capacity',true,'Cera de soja'),line('catalyst','Estabilizador','g','per100wax',true,'Estabilizador para cera de soja',2.5),line('fragrance','Fragancia elegida','ml','per100wax_ml',true,'Según fragancia elegida',5),{...line('wick','Pabilo','cm','wick_external',true,'Pabilo',1),triada_quantity:3},line('tab','Chapita base','unit','same_wicks',true,'Chapita base de pabilo')]:kind==='custom'?[line('component','Componente')]:[line('vessel','Envase / frasco','unit','fixed',true,'',1),line('base','Alcohol de cereal tridestilado','ml','per100ml',true,'Alcohol de cereal tridestilado',kind==='diffuser'?84:94),line('fragrance','Fragancia elegida','ml','per100ml',true,'Según fragancia elegida',kind==='diffuser'?16:6),line('accessory',kind==='diffuser'?'Varillas':'Válvula / gatillo','unit','fixed',true,kind==='diffuser'?'Varillas':'Válvula / gatillo',kind==='diffuser'?null:1)];
  for(let i=1;i<=4;i++)lines.push({...line('pack'+i,'Componente '+i,'unit','fixed',false),group:'presentation'});
  return {kind,defaults:{wax_g_per_cc:.85},lines};
 }
 function suggest(l,product){return {...clone(l),name:l.default_name||(l.key==='fragrance'?'Según fragancia elegida':''),quantity:l.key==='wick'&&norm(product.name).includes('triada')?(l.triada_quantity??3):(l.default_quantity??null)};}
 function newRecipe(template,product){return {...clone(template.data),category_id:product.category_id,template_revision:template.revision,status:'draft',measures:{fill_ml:num(product.capacity_cc),wax_g_per_cc:template.data.defaults?.wax_g_per_cc??.85},lines:template.data.lines.map(l=>suggest(l,product))};}
 function purchaseAmount(value,unit,purchase={}){
  if(!Number.isFinite(value))return null;
  const target=purchase.unit||unit,scale={ml:1,l:1000,g:1,kg:1000,cm:1,m:100,unit:1},dim={ml:'volume',l:'volume',g:'mass',kg:'mass',cm:'length',m:'length',unit:'count'};
  let base=value*scale[unit],converted=false;
  if(dim[unit]!==dim[target]){if(!(purchase.density_g_ml>0))return null;
   if(dim[unit]==='volume'&&dim[target]==='mass')base*=purchase.density_g_ml;
   else if(dim[unit]==='mass'&&dim[target]==='volume')base/=purchase.density_g_ml;
   else return null;converted=true;
  }
  const amount=base/scale[target];return {amount,unit:target,packs:purchase.pack_size>0?Math.ceil(Math.max(0,amount/purchase.pack_size-1e-10)):null,converted};
 }
 function purchaseFields(p={},key='fragrance',unit='ml'){
  p={...purchaseDefault(key,unit),...p};return `<details class="mfg-purchase"><summary>Unidad y envase de compra</summary><div class="mfg-measure-grid"><label>Unidad de compra<select data-punit>${option(purchaseUnits,p.unit)}</select></label><label>Contenido de cada envase / paquete<input data-pack type="number" min="0" step="any" value="${p.pack_size??''}" placeholder="Opcional"></label><label>Equivalencia estimada: g por ml<input data-density type="number" min="0.001" step="any" value="${p.density_g_ml??.9}"></label></div><small>La densidad sólo se usa al convertir peso y volumen. Referencias orientativas: alcohol 96° ≈ 0,81; esencias ≈ 0,90, variable según esencia. Ajustable. El contenido del envase se expresa en la unidad de compra elegida.</small></details>`;
 }
 function readPurchase(el){return {unit:el.querySelector('[data-punit]').value,pack_size:num(el.querySelector('[data-pack]').value),density_g_ml:num(el.querySelector('[data-density]').value)};}
 function purchaseText(value,unit,purchase){const p=purchaseAmount(value,unit,purchase);return p?`${fmt(p.amount)} ${purchaseUnits[p.unit]}${p.converted?' (conversión estimada)':''}${p.packs!=null?' · '+p.packs+' envase(s)/paquete(s) completos':''}`:'Conversión pendiente o unidades incompatibles';}
 function groupRows(lines,render){return lines.filter(l=>l.group!=='presentation').map(render).join('')+(lines.some(l=>l.group==='presentation')?`<fieldset class="mfg-presentation"><legend>Presentación</legend><p>Hasta cuatro componentes opcionales: caja, papel, moño, bolsa…</p>${lines.filter(l=>l.group==='presentation').map(render).join('')}</fieldset>`:'');}
 function totals(data){
  const m=data.measures||{}, lines=data.lines||[], errors=[];
  let mass=num(m.final_mass_g);if(!(mass>0))mass=m.fill_ml>0&&m.density_g_ml>0?m.fill_ml*m.density_g_ml:null;
  const active=lines.filter(l=>l.name?.trim()||l.required);
  const waxRates=active.filter(l=>l.basis==='per100wax').reduce((s,l)=>s+(num(l.quantity)||0),0);
  const massRates=active.filter(l=>l.basis==='per100mass').reduce((s,l)=>s+(num(l.quantity)||0),0);
  if(active.some(l=>l.basis==='per100wax')&&active.some(l=>l.basis==='per100mass'))errors.push('Usá la misma base para los aditivos: cera o mezcla final.');
  if(massRates>=100)errors.push('La mezcla debe conservar una proporción positiva de cera.');
  const byCapacity=lines.some(l=>l.basis==='wax_capacity');
  const wax=byCapacity?(m.wax_override_g>0?m.wax_override_g:m.fill_ml>0&&m.wax_g_per_cc>0?m.fill_ml*m.wax_g_per_cc:null):mass>0?(massRates?mass*(1-massRates/100):mass/(1+waxRates/100)):null;
  const wicks=lines.find(l=>l.key==='wick')?.quantity;
  const liquidRates=active.filter(l=>l.basis==='per100ml'&&l.unit==='ml').reduce((a,l)=>a+(num(l.quantity)||0),0);
  if(['diffuser','spray'].includes(data.kind)&&Math.abs(liquidRates-100)>.000001)errors.push('Alcohol y esencia deben sumar 100 % en volumen.');
  const rows=lines.map(l=>{let q=num(l.quantity),value=q;
   if(['wax','wax_capacity'].includes(l.basis))value=wax;
   if(l.basis==='per100wax_ml')value=wax>0&&q!=null?wax*q/100:null;
   if(l.basis==='wick_external')value=m.external_height_cm>0&&q!=null?q*m.external_height_cm:null;
   if(l.basis==='same_wicks')value=num(wicks);
   if(l.basis==='per100wax')value=wax>0&&q!=null?wax*q/100:null;
   if(l.basis==='per100mass')value=mass>0&&q!=null?mass*q/100:null;
   if(l.basis==='per100ml')value=m.fill_ml>0&&q!=null?m.fill_ml*q/100:null;
   if(l.basis==='wick')value=m.internal_height_cm>0&&num(m.wick_allowance_cm)!=null&&q!=null?q*(Number(m.internal_height_cm)+Number(m.wick_allowance_cm)):null;
   return {...l,total:value};
  });
  return {mass,wax,rows,errors};
 }
 function validate(data,type){
  const errors=[];
  for(const l of data.lines||[]){const p=l.purchase;if(p){if(!purchaseUnits[p.unit]||(p.pack_size!=null&&(!Number.isFinite(p.pack_size)||p.pack_size<=0))||(p.density_g_ml!=null&&(!Number.isFinite(p.density_g_ml)||p.density_g_ml<=0)))errors.push('Revisá unidad, contenido de compra y equivalencia.');if(l.unit&&purchaseAmount(1,l.unit,p)==null)errors.push('La unidad de compra no es compatible con el consumo.');}
   if(type==='category'&&l.default_quantity!=null&&(!Number.isFinite(l.default_quantity)||l.default_quantity<0||((l.unit==='unit'||l.basis==='wick_external')&&!Number.isInteger(l.default_quantity))))errors.push('Revisá las cantidades sugeridas.');
  }
  if(type==='fragrance'){
   if(data.lines.some(l=>l.purchase&&!['ml','l','g','kg'].includes(l.purchase.unit)))errors.push('Las esencias se compran por peso o volumen.');
   if(data.density_g_ml!=null&&(!(data.density_g_ml>0)||data.density_g_ml>100))errors.push('Revisá la densidad de la mezcla.');
   if(!['volume','mass'].includes(data.composition_basis||'volume'))errors.push('Indicá la base de composición.');
   if(data.lines.length>4)errors.push('Máximo cuatro esencias.');
   let seen=new Set(),total=0;
   for(const l of data.lines){let n=norm(l.name);if(!n||seen.has(n))errors.push('Revisá esencias vacías o repetidas.');seen.add(n);if(!(l.percent>0&&l.percent<=100))errors.push('Cada porcentaje debe ser mayor que 0 y hasta 100.');total+=l.percent||0;}
   if(total>100.000001||data.status==='ready'&&Math.abs(total-100)>0.000001)errors.push('La composición lista debe sumar 100 %.');
   return [...new Set(errors)];
  }
  if(!data.lines.length||data.lines.length>20)errors.push('Completá entre 1 y 20 componentes.');
  const seen=new Set();
  for(const l of data.lines){if(!l.label?.trim()||seen.has(l.key))errors.push('Revisá los componentes del modelo.');seen.add(l.key);
   if(['wax','wax_capacity','per100wax','per100mass'].includes(l.basis)&&l.unit!=='g'||['wick','wick_external'].includes(l.basis)&&l.unit!=='cm'||l.basis==='per100wax_ml'&&l.unit!=='ml'||l.basis==='same_wicks'&&l.unit!=='unit')errors.push('La unidad debe corresponder al cálculo.');
   if(type==='product'&&l.quantity!=null&&(!Number.isFinite(l.quantity)||l.quantity<0||l.quantity>1000000||l.unit==='unit'&&!Number.isInteger(l.quantity)||['wick','wick_external'].includes(l.basis)&&!Number.isInteger(l.quantity)))errors.push('Revisá las cantidades; unidades y pabilos deben ser enteros.');
  }
  if(type==='product'){
   if(data.measures?.alcohol_strength_percent>100)errors.push('La concentración del alcohol no puede superar 100 %.');
   if(data.status==='ready'&&!data.lines.some(l=>l.name?.trim()))errors.push('Completá al menos un componente.');
   if(data.status==='ready'&&data.lines.some(l=>!l.name?.trim()&&l.quantity>0))errors.push('Ingresá el nombre de cada componente con cantidad.');
   for(const v of Object.values(data.measures||{}))if(v!=null&&(!Number.isFinite(v)||v<0||v>1000000))errors.push('Revisá las medidas.');
   let t=totals(data);if(data.status==='ready')errors.push(...t.errors);
   if(data.status==='ready')for(const l of t.rows)if(l.required||l.name?.trim()){
    if(!l.name?.trim())errors.push('Falta completar: '+l.label+'.');
    if(!(l.total>0))errors.push('Falta cantidad o datos de cálculo: '+l.label+'.');
   }
  }
  return [...new Set(errors)];
 }
 async function get(table,key,id){let r=await sb.from(table).select('*').eq(key,id).maybeSingle();if(r.error)throw new Error(r.error.message);return r.data;}
 async function put(table,key,id,data,record){
  let r=record?await sb.from(table).update({data}).eq(key,id).eq('revision',record.revision).select().maybeSingle():await sb.from(table).insert({[key]:id,data}).select().single();
  if(r.error)throw new Error(r.error.code==='23505'?'Otra sesión ya creó esta configuración. Volvé a abrir la ficha antes de guardar.':r.error.message);
  if(!r.data)throw new Error('La configuración cambió en otra sesión. Volvé a abrir la ficha para revisar los cambios.');
  return r.data;
 }
 function section(title,id){
  let box=document.createElement('details');box.className='mfg-section';box.dataset.recordId=id||'';box.innerHTML=`<summary>${esc(title)} <small>Uso interno</small></summary><div class="mfg-body" aria-busy="true"><p role="status">Cargando configuración…</p></div>`;
  const form=document.querySelector('.admin-form');(form.querySelector('[data-content-slot]')||form).appendChild(box);if(form.querySelector('[data-content-slot]'))box.open=true;
  if(!id){box.querySelector('.mfg-body').innerHTML='<p>Guardá primero los datos de esta ficha. Después abrila para configurar esta sección.</p>';box.querySelector('.mfg-body').removeAttribute('aria-busy');}
  return box;
 }
 function actions(text){return `<div class="mfg-actions"><button type="button" class="btn" data-save>${esc(text)}</button><button type="button" class="text-link" data-discard>Descartar cambios de esta sección</button><p data-msg role="status" aria-live="polite"></p></div>`;}
 function dirtyGuard(box){let dirty=false;box.addEventListener('input',()=>dirty=true);box.addEventListener('change',()=>dirty=true);box.mfgClean=()=>dirty=false;
  let form=box.closest('.admin-form');form.querySelector('#afSave, #catSave')?.addEventListener('click',e=>{if(dirty){e.preventDefault();e.stopImmediatePropagation();box.open=true;box.querySelector('[data-msg]').textContent='Guardá primero esta sección para conservar los cambios de fabricación.';}},true);
 }
 function saveHandler(box,read,save,type){let button=box.querySelector('[data-save]'),msg=box.querySelector('[data-msg]');button.onclick=async()=>{if(button.disabled)return;try{const data=read(),errors=validate(data,type);if(errors.length){msg.textContent=errors.join(' ');return;}button.disabled=true;msg.textContent='Guardando…';await save(data);box.mfgClean?.();msg.textContent='Guardado. '+(data.status==='ready'?'Configuración lista para producción.':'');}catch(e){msg.textContent='No se pudo guardar: '+e.message;}finally{button.disabled=false;}};dirtyGuard(box);box.querySelector('[data-discard]').onclick=()=>{if(!confirm('¿Descartar los cambios sin guardar de esta sección?'))return;box.mfgClean();const id=box.dataset.recordId;box.remove();({category:mountCategory,product:mountProduct,fragrance:mountFragrance})[type](id);};}
 async function mountCategory(id){
  const box=section('Modelo de fabricación',id);if(!id)return;
  try{let record=await get('category_manufacturing_templates','category_id',id);if(!box.isConnected)return;
   let model=clone(record?.data||preset('candle'));const body=box.querySelector('.mfg-body');
   body.innerHTML=`<p>Definí componentes y cantidades sugeridas. Los productos nuevos las heredan y pueden personalizarlas.</p><div class="mfg-inline"><label>Modelo inicial<select data-kind>${option(kinds,model.kind)}</select></label><button type="button" class="btn secondary" data-preset>Usar modelo Micha</button></div><p class="admin-help">Reemplaza este borrador, sin modificar recetas guardadas de productos.</p><label>Factor orientativo de cera: g por cc de capacidad<input data-factor type="number" min="0.001" step="any" value="${model.defaults?.wax_g_per_cc??.85}"></label><p class="admin-help">0,85 es una estimación práctica inicial, no una densidad certificada: contempla aproximadamente llenado y aditivos. Ajustalo según el consumo real de tus envases.</p><div data-lines></div><button type="button" class="text-link" data-add>+ Agregar componente</button>${actions('Guardar modelo de fabricación')}`;
   const read=()=>({kind:body.querySelector('[data-kind]').value,defaults:{wax_g_per_cc:num(body.querySelector('[data-factor]').value)},lines:[...body.querySelectorAll('[data-line]')].map(el=>({...model.lines.find(l=>l.key===el.dataset.line),key:el.dataset.line,label:el.querySelector('[data-label]').value.trim(),required:el.querySelector('[data-required]').checked,unit:el.querySelector('[data-unit]').value,basis:el.querySelector('[data-basis]').value,default_name:el.querySelector('[data-default-name]').value.trim(),default_quantity:num(el.querySelector('[data-default-qty]').value),triada_quantity:num(el.querySelector('[data-triada]')?.value),purchase:readPurchase(el)}))});
   const draw=()=>{body.querySelector('[data-factor]').closest('label').hidden=model.kind!=='candle';body.querySelector('[data-lines]').innerHTML=groupRows(model.lines,l=>`<div class="mfg-template-card" data-line="${esc(l.key)}"><div class="mfg-template-row"><label>Componente<input data-label value="${esc(l.label)}" maxlength="100"></label><label>Unidad<select data-unit>${option(units,l.unit)}</select></label><label>Cálculo<select data-basis>${option(bases,l.basis)}</select></label><label class="check"><input type="checkbox" data-required ${l.required?'checked':''}> Obligatorio</label><button type="button" data-remove>Quitar</button></div><div class="mfg-measure-grid"><label>Nombre sugerido<input data-default-name value="${esc(l.default_name||'')}" maxlength="150"></label><label>Cantidad sugerida (${esc(units[l.unit])})<input data-default-qty type="number" min="0" step="any" value="${l.default_quantity??''}" ${automatic(l.basis)?'disabled':''}></label>${l.key==='wick'?`<label>Pabilos sugeridos para Tríada<input data-triada type="number" min="1" step="1" value="${l.triada_quantity??3}"></label>`:''}</div>${purchaseFields(l.purchase,l.key,l.unit)}</div>`);};draw();
   body.querySelector('[data-lines]').addEventListener('click',e=>{if(e.target.matches('[data-remove]')){model=read();model.lines=model.lines.filter(l=>l.key!==e.target.closest('[data-line]').dataset.line);draw();box.dispatchEvent(new Event('change',{bubbles:true}));}});
   body.querySelector('[data-lines]').addEventListener('change',e=>{if(e.target.matches('[data-basis]')){let row=e.target.closest('[data-line]'),b=e.target.value;row.querySelector('[data-default-qty]').disabled=automatic(b);if(['wax','wax_capacity','per100wax','per100mass'].includes(b))row.querySelector('[data-unit]').value='g';if(['wick','wick_external'].includes(b))row.querySelector('[data-unit]').value='cm';if(b==='per100wax_ml')row.querySelector('[data-unit]').value='ml';if(b==='same_wicks')row.querySelector('[data-unit]').value='unit';}});
   body.querySelector('[data-add]').onclick=()=>{model=read();if(model.lines.length>=20)return;model.lines.push({key:'custom_'+crypto.randomUUID(),label:'Nuevo componente',unit:'unit',basis:'fixed',required:false});draw();box.dispatchEvent(new Event('change',{bubbles:true}));};
   body.querySelector('[data-preset]').onclick=()=>{if(!confirm('¿Reemplazar este borrador por el modelo Micha? Las recetas de productos se conservan.'))return;model=preset(body.querySelector('[data-kind]').value);body.querySelector('[data-factor]').value=model.defaults.wax_g_per_cc;draw();box.dispatchEvent(new Event('change',{bubbles:true}));};
   saveHandler(box,read,async data=>{record=await put('category_manufacturing_templates','category_id',id,data,record);},'category');body.removeAttribute('aria-busy');
  }catch(e){if(box.isConnected)box.querySelector('.mfg-body').textContent='No se pudo cargar el modelo: '+e.message;}
 }
 async function mountFragrance(id){
  const box=section('Composición de la fragancia',id);if(!id)return;
  try{let record=await get('fragrance_compositions','fragrance_id',id);if(!box.isConnected)return;const data=record?.data||{status:'draft',lines:[]},body=box.querySelector('.mfg-body');
   body.innerHTML=`<p>Hasta cuatro esencias. Los porcentajes se aplican a la cantidad total de fragancia que necesita el producto. Se guarda por separado de su nombre y descripción.</p><label>Los porcentajes de composición están medidos por<select data-composition-basis>${option({volume:"Volumen (ml)",mass:"Peso (g)"},data.composition_basis||"volume")}</select></label><label>Densidad estimada de la mezcla (g/ml)<input data-mix-density type="number" min="0.001" step="any" value="${data.density_g_ml??.9}"></label><div class="mfg-blend">${Array.from({length:4},(_,i)=>`<div data-blend><label>Esencia ${i+1}<input data-name maxlength="150" value="${esc(data.lines[i]?.name||'')}" placeholder="Nombre de la esencia"></label><label>Porcentaje<input data-percent type="number" min="0" max="100" step="0.01" value="${data.lines[i]?.percent??''}"></label>${purchaseFields(data.lines[i]?.purchase,'fragrance','ml')}</div>`).join('')}</div><p data-total role="status"></p><label>Estado<select data-status>${option({draft:'Borrador',ready:'Lista para producción'},data.status)}</select></label>${actions('Guardar composición')}`;
   const read=()=>({composition_basis:body.querySelector('[data-composition-basis]').value,density_g_ml:num(body.querySelector('[data-mix-density]').value),status:body.querySelector('[data-status]').value,lines:[...body.querySelectorAll('[data-blend]')].map(el=>({name:el.querySelector('[data-name]').value.trim(),percent:num(el.querySelector('[data-percent]').value),purchase:readPurchase(el)})).filter(l=>l.name||l.percent!=null)});
   const update=()=>{let total=read().lines.reduce((s,l)=>s+(l.percent||0),0);body.querySelector('[data-total]').textContent=`Total: ${fmt(total)} % · ${Math.abs(100-total)<0.000001?'Completo':total<100?'Falta '+fmt(100-total)+' %':'Excede por '+fmt(total-100)+' %'}`;};body.addEventListener('input',update);update();
   saveHandler(box,read,async data=>{record=await put('fragrance_compositions','fragrance_id',id,data,record);},'fragrance');body.removeAttribute('aria-busy');
  }catch(e){if(box.isConnected)box.querySelector('.mfg-body').textContent='No se pudo cargar la composición: '+e.message;}
 }
 const measures={fill_ml:'Capacidad / volumen de llenado (cc = ml)',wax_g_per_cc:'Factor de cera (g por cc)',wax_override_g:'Cera medida por producto (g, opcional)',external_height_cm:'Altura exterior del frasco = largo de cada pabilo (cm)',diameter_cm:'Diámetro exterior (cm)',width_cm:'Ancho exterior (cm)',depth_cm:'Profundidad exterior (cm)'};
 async function mountProduct(id){
  const box=section('Fabricación y componentes',id);if(!id)return;
  try{const product=adminCache.products.find(p=>p.id===id);let [record,template]=await Promise.all([get('product_manufacturing_recipes','product_id',id),get('category_manufacturing_templates','category_id',product.category_id)]);if(!box.isConnected)return;
   const body=box.querySelector('.mfg-body');if(!record&&!template){body.innerHTML='<p>Configurá primero el modelo de fabricación desde Categorías.</p>';body.removeAttribute('aria-busy');return;}
   let data=clone(record?.data||newRecipe(template,product)),composition=null,compositionSeq=0;
   const available=adminCache.fragrances;
   body.innerHTML=`<p>Valores sugeridos de la categoría, editables por producto. El cálculo estima consumos para compras; no modifica stock.</p><p data-model-note></p><details class="mfg-copy"><summary>Actualizar sugerencias o copiar receta</summary><button type="button" class="btn secondary" data-reset-template>Restablecer modelo actual de categoría</button><p>Reemplaza componentes y proporciones de este borrador. Conserva tus medidas; requiere guardar.</p><label>Copiar de otro producto<select data-copy-source><option value="">Seleccionar</option>${adminCache.products.filter(p=>p.id!==id&&p.category_id===product.category_id).map(p=>`<option value="${esc(p.id)}">${esc(p.name+' · '+(p.color||''))}</option>`).join('')}</select></label><button type="button" class="text-link" data-copy>Copiar al borrador</button></details><details class="mfg-measures"><summary>Ajustes del cálculo y volumen de llenado</summary><div class="mfg-measure-grid">${Object.entries(measures).filter(([k])=>data.kind==='candle'||!['wax_g_per_cc','wax_override_g'].includes(k)).map(([k,label])=>`<label>${esc(label)}<input data-measure="${k}" type="number" min="0" step="any" value="${data.measures?.[k]??''}"></label>`).join('')}</div><button type="button" class="text-link" data-capacity>Restablecer capacidad del producto (${esc(product.capacity_cc??'sin dato')} cc)</button><p class="admin-help">${data.kind==='candle'?'La cera se estima con capacidad × factor, o usa la cantidad medida si la indicás. Factor inicial 0,85, editable según consumo real. El pabilo usa la altura exterior, sin margen adicional.':'Alcohol y esencia se calculan sobre el volumen de llenado. Las proporciones son editables y deben sumar 100 %.'}</p></details><div data-lines></div><div class="mfg-measure-grid"><label>Unidades para estimar consumo<input data-batch type="number" min="1" step="1" value="1"></label><label>Fragancia para ver sus esencias<select data-fragrance><option value="">Seleccionar fragancia del catálogo</option>${available.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select></label></div><p class="admin-help">Elegí una fragancia del catálogo para calcular sus esencias. Esto no crea variantes ni stock de venta. La estimación muestra consumo bruto; todavía no descuenta existencias de insumos.</p><div data-preview class="mfg-preview" aria-live="polite"></div><label>Estado<select data-status>${option({draft:'Borrador',ready:'Lista para producción'},data.status)}</select></label>${actions('Guardar fabricación')}`;
   const read=()=>({...data,status:body.querySelector('[data-status]').value,measures:{...data.measures,...Object.fromEntries([...box.closest('.admin-form').querySelectorAll('[data-measure]')].map(el=>[el.dataset.measure,num(el.value)]))},lines:data.lines.map(l=>{let row=[...body.querySelectorAll('[data-recipe-line]')].find(el=>el.dataset.recipeLine===l.key);return {...l,name:row.querySelector('[data-name]').value.trim(),quantity:automatic(l.basis)?null:num(row.querySelector('[data-quantity]')?.value),purchase:readPurchase(row)};})});
   const preview=()=>{const d=read(),t=totals(d),batch=num(body.querySelector('[data-batch]').value);if(!Number.isInteger(batch)||batch<1){body.querySelector('[data-preview]').textContent='Ingresá una cantidad entera de productos mayor a cero.';return;}
    let html=`<b>Consumo estimado para ${batch} producto(s)</b><ul>`+t.rows.filter(l=>l.name||l.required).map(l=>`<li>${esc(l.label)}: <strong>${fmt(l.total==null?null:l.total*batch)} ${esc(units[l.unit])}</strong>${l.key!=='fragrance'?`<small>Compra: ${esc(purchaseText(l.total==null?null:l.total*batch,l.unit,l.purchase))}</small>`:''}</li>`).join('')+'</ul>'+t.errors.map(e=>`<p>${esc(e)}</p>`).join('');
    const fragrance=t.rows.find(l=>l.key==='fragrance');
    if(fragrance&&body.querySelector('[data-fragrance]').value){if(!composition)html+='<p>La fragancia no tiene composición guardada. Completala desde Fragancias.</p>';else if(composition.data.status!=='ready')html+='<p>La composición está en borrador. Debe sumar 100 % y estar lista para desglosar esencias.</p>';else{
      const mix=composition.data,desired=mix.composition_basis==='mass'?'g':'ml',converted=purchaseAmount(fragrance.total,fragrance.unit,{unit:desired,density_g_ml:mix.density_g_ml});
      html+='<b>Esencias de la fragancia</b>';if(!converted)html+='<p>Falta equivalencia para convertir la unidad de la mezcla.</p>';else html+='<ul>'+mix.lines.map(l=>{const amount=converted.amount*batch*l.percent/100;return `<li>${esc(l.name)} (${fmt(l.percent)} %): <strong>${fmt(amount)} ${desired}</strong><small>Compra: ${esc(purchaseText(amount,desired,l.purchase))}</small></li>`;}).join('')+'</ul>';
     }}body.querySelector('[data-preview]').innerHTML=html;
    for(const row of body.querySelectorAll('[data-recipe-line]')){const l=d.lines.find(x=>x.key===row.dataset.recipeLine),total=t.rows.find(x=>x.key===l.key),out=row.querySelector('[data-line-total]');if(out)out.textContent=fmt(total?.total)+' '+units[l.unit];const base=template?.data.lines.find(x=>x.key===l.key),hint=row.querySelector('[data-origin]');if(base&&hint){const suggested=suggest(base,product);hint.textContent=l.quantity===suggested.quantity&&l.name===suggested.name&&l.basis===suggested.basis?'Sugerido de categoría':'Personalizado';}}
   };
   const draw=()=>{const picker=body.querySelector('[data-fragrance]')?.closest('label');if(picker)body.insertBefore(picker,body.querySelector('[data-lines]'));body.querySelector('[data-lines]').innerHTML=groupRows(data.lines,l=>`<div class="mfg-recipe-card" data-recipe-line="${esc(l.key)}"><details ${!l.name&&l.required?'open':''}><summary class="mfg-row-summary"><span>${esc(l.label)} <small>Ajustar</small></span><output data-line-total></output></summary><div class="mfg-recipe-row"><label>${esc(l.label)} <small>${l.required?'Obligatorio':'Opcional'} · <span data-origin></span></small><input data-name maxlength="150" value="${esc(l.name||'')}" placeholder="Nombre del componente" ${l.key==='fragrance'?'readonly aria-label="Referencia de cálculo por fragancia"':''}></label><label>${['wick','wick_external'].includes(l.basis)?'Cantidad de pabilos':esc(bases[l.basis])}${automatic(l.basis)?'<span>Automático</span>':`<input data-quantity type="number" min="0" step="${l.unit==='unit'||['wick','wick_external'].includes(l.basis)?'1':'any'}" value="${l.quantity??''}">`}<small>${['wick','wick_external'].includes(l.basis)?'El total se expresa en cm':esc(units[l.unit])}</small></label></div><button type="button" class="text-link" data-reset-line>Restablecer sugerencia</button>${purchaseFields(l.purchase,l.key,l.unit)}</details></div>`);body.querySelector('[data-model-note]').textContent=`Modelo: ${kinds[data.kind]} · revisión ${data.template_revision||'propia'}. `+(template&&data.template_revision!==template.revision?'La categoría tiene cambios; tu receta conserva sus valores.':'');preview();};draw();
   const selectorLabel=body.querySelector('[data-fragrance]').closest('label');
   const placeFragrance=()=>{const row=body.querySelector('[data-recipe-line="fragrance"]');if(row&&selectorLabel.parentElement!==row)row.prepend(selectorLabel);};placeFragrance();
   const rowsObserver=new MutationObserver(placeFragrance);rowsObserver.observe(body.querySelector('[data-lines]'),{childList:true});
   body.addEventListener('input',preview);body.addEventListener('change',e=>{if(!e.target.matches('[data-fragrance]'))preview();});
   body.querySelector('[data-fragrance]').onchange=async()=>{const seq=++compositionSeq,id=body.querySelector('[data-fragrance]').value;composition=null;if(!id){preview();return;}body.querySelector('[data-preview]').textContent='Cargando composición…';try{const r=await get('fragrance_compositions','fragrance_id',id);if(seq!==compositionSeq||!box.isConnected)return;composition=r;preview();}catch(e){if(seq===compositionSeq)body.querySelector('[data-preview]').textContent='No se pudo cargar la composición: '+e.message;}};
   body.querySelector('[data-capacity]').onclick=()=>{body.querySelector('[data-measure="fill_ml"]').value=product.capacity_cc??'';preview();box.dispatchEvent(new Event('change',{bubbles:true}));};
   body.querySelector('[data-lines]').onclick=e=>{if(!e.target.matches('[data-reset-line]'))return;const key=e.target.closest('[data-recipe-line]').dataset.recipeLine,source=template?.data.lines.find(l=>l.key===key);if(!source)return;data=read();data.lines=data.lines.map(l=>l.key===key?suggest(source,product):l);data.status='draft';body.querySelector('[data-status]').value='draft';draw();box.dispatchEvent(new Event('change',{bubbles:true}));};
   body.querySelector('[data-reset-template]').disabled=!template;body.querySelector('[data-reset-template]').onclick=()=>{if(!confirm('¿Restablecer componentes y proporciones de categoría? Se conservarán las medidas del envase.'))return;const old=read();data={...newRecipe(template,product),measures:old.measures};body.querySelector('[data-status]').value='draft';draw();box.dispatchEvent(new Event('change',{bubbles:true}));};
   body.querySelector('[data-copy]').onclick=async()=>{const source=body.querySelector('[data-copy-source]').value,msg=body.querySelector('[data-msg]');if(!source)return;try{const r=await get('product_manufacturing_recipes','product_id',source);if(!box.isConnected)return;if(!r)return msg.textContent='Ese producto no tiene receta guardada.';if(!confirm('¿Reemplazar este borrador por la receta seleccionada? Revisá después las medidas del envase.'))return;data=clone(r.data);data.status='draft';data.category_id=product.category_id;box.closest('.admin-form').querySelectorAll('[data-measure]').forEach(el=>el.value=data.measures?.[el.dataset.measure]??'');body.querySelector('[data-status]').value='draft';draw();msg.textContent='Copiada al borrador. Revisá y guardá.';box.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){msg.textContent=e.message;}};
   const physical=box.closest('.admin-form').querySelector('[data-physical-measures]');
   if(physical){
    physical.replaceChildren();const grid=document.createElement('div');grid.className='mfg-measure-grid';physical.appendChild(grid);
    for(const key of ['external_height_cm','diameter_cm','width_cm','depth_cm']){const input=body.querySelector('[data-measure="'+key+'"]');if(input)grid.appendChild(input.closest('label'));}
    const note=document.createElement('p');note.className='admin-help';note.textContent='Medidas en cm. La altura exterior define el largo de cada pabilo. Se guardan con Fabricación.';physical.appendChild(note);
    const button=document.createElement('button');button.type='button';button.className='text-link';button.textContent='Guardar medidas y fabricación';button.onclick=async()=>{await box.querySelector('[data-save]').onclick();note.textContent=box.querySelector('[data-msg]').textContent;};physical.appendChild(button);
    physical.oninput=()=>{preview();box.dispatchEvent(new Event('input',{bubbles:true}));};
   }
   saveHandler(box,read,async d=>{if(document.getElementById('afCat').value!==product.category_id)throw new Error('Guardá primero el cambio de categoría y volvé a abrir el producto.');record=await put('product_manufacturing_recipes','product_id',id,d,record);data=clone(record.data);},'product');body.removeAttribute('aria-busy');
  }catch(e){if(box.isConnected)box.querySelector('.mfg-body').textContent='No se pudo cargar la receta: '+e.message;}
 }
 return {preset,totals,validate,newRecipe,purchaseAmount,mountCategory,mountProduct,mountFragrance};
})();
const mfgOriginalCategoryForm=categoryForm, mfgOriginalProductForm=productForm, mfgOriginalFragForm=fragForm;
categoryForm=function(id){mfgOriginalCategoryForm(id);if(typeof CatalogLayout!=='undefined')CatalogLayout.arrange('category');Mfg.mountCategory(id);};
productForm=function(id,template){mfgOriginalProductForm(id,template);if(typeof CatalogLayout!=='undefined')CatalogLayout.arrange('product');Mfg.mountProduct(id);};
fragForm=function(id){mfgOriginalFragForm(id);if(typeof CatalogLayout!=='undefined')CatalogLayout.arrange('fragrance');Mfg.mountFragrance(id);};
