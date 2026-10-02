/* Internal manufacturing configuration. No stock writes or public recipe reads. */
const Mfg = (() => {
 const units={g:'g',ml:'ml',unit:'unidades',cm:'cm'}, bases={fixed:'Por producto',per100wax:'Por 100 g de cera',per100mass:'Por 100 g de mezcla final',per100ml:'Por 100 ml finales',wax:'Cera calculada',wick:'Pabilos × (altura + margen)'};
 const kinds={candle:'Vela',diffuser:'Difusor',spray:'Home spray / vaporizador',custom:'Personalizado'};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const esc=x=>ae(x), num=x=>x===''||x==null?null:Number(x), fmt=x=>Number.isFinite(x)?x.toLocaleString('es-AR',{maximumFractionDigits:3}):'Pendiente';
 const option=(items,value)=>Object.entries(items).map(([k,v])=>`<option value="${esc(k)}" ${k===value?'selected':''}>${esc(v)}</option>`).join('');
 function preset(kind){
  const line=(key,label,unit='unit',basis='fixed',required=true)=>({key,label,unit,basis,required});
  let lines=kind==='candle'?[line('vessel','Envase / frasco'),line('wax','Cera','g','wax'),line('catalyst','Catalizador','g','per100wax'),line('fragrance','Fragancia elegida','g','per100wax'),line('wick','Pabilo','cm','wick'),line('tab','Chapita base')]:kind==='custom'?[line('component','Componente')]:[line('vessel','Envase / frasco'),line('base','Base / alcohol diluido','ml','per100ml'),line('fragrance','Fragancia elegida','ml','per100ml'),line('accessory',kind==='diffuser'?'Varillas':'Válvula / gatillo')];
  for(let i=1;i<=4;i++)lines.push({...line('pack'+i,'Presentación '+i,'unit','fixed',false),group:'presentation'});
  return {kind,lines};
 }
 function totals(data){
  const m=data.measures||{}, lines=data.lines||[], errors=[];
  let mass=num(m.final_mass_g);if(!(mass>0))mass=m.fill_ml>0&&m.density_g_ml>0?m.fill_ml*m.density_g_ml:null;
  const active=lines.filter(l=>l.name?.trim()||l.required);
  const waxRates=active.filter(l=>l.basis==='per100wax').reduce((s,l)=>s+(num(l.quantity)||0),0);
  const massRates=active.filter(l=>l.basis==='per100mass').reduce((s,l)=>s+(num(l.quantity)||0),0);
  if(active.some(l=>l.basis==='per100wax')&&active.some(l=>l.basis==='per100mass'))errors.push('Usá la misma base para los aditivos: cera o mezcla final.');
  if(massRates>=100)errors.push('La mezcla debe conservar una proporción positiva de cera.');
  const wax=mass>0?(massRates?mass*(1-massRates/100):mass/(1+waxRates/100)):null;
  const rows=lines.map(l=>{let q=num(l.quantity),value=q;
   if(l.basis==='wax')value=wax;
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
  if(type==='fragrance'){
   if(data.lines.length>4)errors.push('Máximo cuatro esencias.');
   let seen=new Set(),total=0;
   for(const l of data.lines){let n=norm(l.name);if(!n||seen.has(n))errors.push('Revisá esencias vacías o repetidas.');seen.add(n);if(!(l.percent>0&&l.percent<=100))errors.push('Cada porcentaje debe ser mayor que 0 y hasta 100.');total+=l.percent||0;}
   if(total>100.000001||data.status==='ready'&&Math.abs(total-100)>0.000001)errors.push('La composición lista debe sumar 100 %.');
   return [...new Set(errors)];
  }
  if(!data.lines.length||data.lines.length>20)errors.push('Completá entre 1 y 20 componentes.');
  const seen=new Set();
  for(const l of data.lines){if(!l.label?.trim()||seen.has(l.key))errors.push('Revisá los componentes del modelo.');seen.add(l.key);
   if(['wax','per100wax','per100mass'].includes(l.basis)&&l.unit!=='g'||l.basis==='wick'&&l.unit!=='cm')errors.push('La unidad debe corresponder al cálculo.');
   if(type==='product'&&l.quantity!=null&&(!Number.isFinite(l.quantity)||l.quantity<0||l.quantity>1000000||l.unit==='unit'&&!Number.isInteger(l.quantity)||l.basis==='wick'&&!Number.isInteger(l.quantity)))errors.push('Revisá las cantidades; unidades y pabilos deben ser enteros.');
  }
  if(type==='product'){
   if(data.measures?.alcohol_strength_percent>100)errors.push('La concentración del alcohol no puede superar 100 %.');
   if(data.status==='ready'&&!data.lines.some(l=>l.name?.trim()))errors.push('Completá al menos un componente.');
   if(data.status==='ready'&&data.lines.some(l=>!l.name?.trim()&&l.quantity>0))errors.push('Ingresá el nombre de cada componente con cantidad.');
   for(const v of Object.values(data.measures||{}))if(v!=null&&(!Number.isFinite(v)||v<0||v>1000000))errors.push('Revisá las medidas.');
   let t=totals(data);errors.push(...t.errors);
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
  document.querySelector('.admin-form').appendChild(box);
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
   body.innerHTML=`<p>Definí qué debe completar cada producto. Las cantidades se cargan en su ficha. Este guardado es independiente de los datos de categoría.</p><div class="mfg-inline"><label>Modelo inicial<select data-kind>${option(kinds,model.kind)}</select></label><button type="button" class="btn secondary" data-preset>Usar este modelo</button></div><p class="admin-help">Aplicar un modelo reemplaza los renglones de este editor. No modifica recetas guardadas de productos.</p><div data-lines></div><button type="button" class="text-link" data-add>+ Agregar componente</button><p class="admin-help">Los cuatro renglones de presentación son opcionales. Podés renombrarlos como caja, papel, moño o bolsa.</p>${actions('Guardar modelo de fabricación')}`;
   const read=()=>({kind:body.querySelector('[data-kind]').value,lines:[...body.querySelectorAll('[data-line]')].map(el=>({key:el.dataset.line,label:el.querySelector('[data-label]').value.trim(),required:el.querySelector('[data-required]').checked,unit:el.querySelector('[data-unit]').value,basis:el.querySelector('[data-basis]').value,...(el.dataset.group?{group:el.dataset.group}:{})}))});
   const draw=()=>{body.querySelector('[data-lines]').innerHTML=model.lines.map(l=>`<div class="mfg-template-row" data-line="${esc(l.key)}" data-group="${esc(l.group||'')}"><label>Componente<input data-label value="${esc(l.label)}" maxlength="100"></label><label>Unidad<select data-unit>${option(units,l.unit)}</select></label><label>Cálculo<select data-basis>${option(bases,l.basis)}</select></label><label class="check"><input type="checkbox" data-required ${l.required?'checked':''}> Obligatorio</label><button type="button" data-remove aria-label="Quitar ${esc(l.label)}">Quitar</button></div>`).join('');};draw();
   body.querySelector('[data-lines]').addEventListener('click',e=>{if(e.target.matches('[data-remove]')){model=read();model.lines=model.lines.filter(l=>l.key!==e.target.closest('[data-line]').dataset.line);draw();box.dispatchEvent(new Event('change',{bubbles:true}));}});
   body.querySelector('[data-lines]').addEventListener('change',e=>{if(e.target.matches('[data-basis]')){let row=e.target.closest('[data-line]');if(['wax','per100wax','per100mass'].includes(e.target.value))row.querySelector('[data-unit]').value='g';if(e.target.value==='wick')row.querySelector('[data-unit]').value='cm';}});
   body.querySelector('[data-add]').onclick=()=>{model=read();if(model.lines.length>=20)return;model.lines.push({key:'custom_'+crypto.randomUUID(),label:'Nuevo componente',unit:'unit',basis:'fixed',required:false});draw();box.dispatchEvent(new Event('change',{bubbles:true}));};
   body.querySelector('[data-preset]').onclick=()=>{model=preset(body.querySelector('[data-kind]').value);draw();box.dispatchEvent(new Event('change',{bubbles:true}));};
   saveHandler(box,read,async data=>{record=await put('category_manufacturing_templates','category_id',id,data,record);},'category');body.removeAttribute('aria-busy');
  }catch(e){if(box.isConnected)box.querySelector('.mfg-body').textContent='No se pudo cargar el modelo: '+e.message;}
 }
 async function mountFragrance(id){
  const box=section('Composición de la fragancia',id);if(!id)return;
  try{let record=await get('fragrance_compositions','fragrance_id',id);if(!box.isConnected)return;const data=record?.data||{status:'draft',lines:[]},body=box.querySelector('.mfg-body');
   body.innerHTML=`<p>Hasta cuatro esencias. Los porcentajes se aplican a la cantidad total de fragancia que necesita el producto. Se guarda por separado de su nombre y descripción.</p><div class="mfg-blend">${Array.from({length:4},(_,i)=>`<div data-blend><label>Esencia ${i+1}<input data-name maxlength="150" value="${esc(data.lines[i]?.name||'')}" placeholder="Nombre de la esencia"></label><label>Porcentaje<input data-percent type="number" min="0" max="100" step="0.01" value="${data.lines[i]?.percent??''}"></label></div>`).join('')}</div><p data-total role="status"></p><label>Estado<select data-status>${option({draft:'Borrador',ready:'Lista para producción'},data.status)}</select></label>${actions('Guardar composición')}`;
   const read=()=>({status:body.querySelector('[data-status]').value,lines:[...body.querySelectorAll('[data-blend]')].map(el=>({name:el.querySelector('[data-name]').value.trim(),percent:num(el.querySelector('[data-percent]').value)})).filter(l=>l.name||l.percent!=null)});
   const update=()=>{let total=read().lines.reduce((s,l)=>s+(l.percent||0),0);body.querySelector('[data-total]').textContent=`Total: ${fmt(total)} % · ${Math.abs(100-total)<0.000001?'Completo':total<100?'Falta '+fmt(100-total)+' %':'Excede por '+fmt(total-100)+' %'}`;};body.addEventListener('input',update);update();
   saveHandler(box,read,async data=>{record=await put('fragrance_compositions','fragrance_id',id,data,record);},'fragrance');body.removeAttribute('aria-busy');
  }catch(e){if(box.isConnected)box.querySelector('.mfg-body').textContent='No se pudo cargar la composición: '+e.message;}
 }
 const measures={final_mass_g:'Peso final de mezcla medido (g)',fill_ml:'Volumen real de llenado (ml)',density_g_ml:'Densidad estimada de la mezcla (g/ml)',internal_height_cm:'Altura interior útil (cm)',wick_allowance_cm:'Margen de corte del pabilo (cm)',external_height_cm:'Altura exterior (cm)',diameter_cm:'Diámetro exterior (cm)',width_cm:'Ancho exterior (cm)',depth_cm:'Profundidad exterior (cm)',alcohol_strength_percent:'Concentración del alcohol utilizado (%)'};
 async function mountProduct(id){
  const box=section('Fabricación y componentes',id);if(!id)return;
  try{const product=adminCache.products.find(p=>p.id===id);let [record,template]=await Promise.all([get('product_manufacturing_recipes','product_id',id),get('category_manufacturing_templates','category_id',product.category_id)]);if(!box.isConnected)return;
   let data=clone(record?.data||{...(template?.data||{kind:'custom',lines:[]}),category_id:product.category_id,template_revision:template?.revision||null,status:'draft',measures:{}});
   data.lines=data.lines.map(l=>({...l,name:l.name??(l.key==='fragrance'?'Según fragancia elegida':''),quantity:l.quantity??null}));
   const body=box.querySelector('.mfg-body');if(!record&&!template){body.innerHTML='<p>Esta categoría todavía no tiene modelo de fabricación. Configuralo desde Categorías y volvé a abrir este producto.</p>';body.removeAttribute('aria-busy');return;}
   body.innerHTML=`<p>Receta por <b>una unidad</b> de esta presentación. Guardado independiente de los datos comerciales. No modifica stock.</p><p data-model-note></p><button type="button" class="btn secondary" data-refresh>Incorporar campos nuevos de la categoría</button><details class="mfg-copy"><summary>Copiar receta de otro producto</summary><label>Producto de origen<select data-copy-source><option value="">Seleccionar</option>${adminCache.products.filter(p=>p.id!==id&&p.category_id===product.category_id).map(p=>`<option value="${esc(p.id)}">${esc(p.name+' · '+(p.color||''))}</option>`).join('')}</select></label><button type="button" class="btn secondary" data-copy>Copiar al borrador</button><p>Revisá envase, medidas y cantidades antes de guardar. No copia stock, precio ni fotos.</p></details><details class="mfg-measures"><summary>Medidas y datos de cálculo</summary><p>El peso medido tiene prioridad. Si falta, el cálculo usa volumen × densidad de mezcla: es una estimación. La capacidad comercial (${esc(product.capacity_cc??'sin dato')} cc) no se modifica.</p><button type="button" class="text-link" data-capacity>Usar capacidad comercial como volumen inicial</button><div class="mfg-measure-grid">${Object.entries(measures).map(([k,label])=>`<label>${esc(label)}<input data-measure="${k}" type="number" min="0" step="any" value="${data.measures?.[k]??''}"></label>`).join('')}</div><p class="admin-help">Las medidas exteriores se guardan aquí como datos técnicos; su publicación al cliente se incorpora en una próxima etapa. La altura no determina por sí sola el tipo de pabilo.</p></details><div data-lines></div><div data-preview class="mfg-preview" aria-live="polite"></div><label>Estado<select data-status>${option({draft:'Borrador',ready:'Lista para producción'},data.status)}</select></label>${actions('Guardar fabricación')}`;
   const read=()=>({...data,status:body.querySelector('[data-status]').value,measures:Object.fromEntries([...body.querySelectorAll('[data-measure]')].map(el=>[el.dataset.measure,num(el.value)])),lines:data.lines.map(l=>{let row=[...body.querySelectorAll('[data-recipe-line]')].find(el=>el.dataset.recipeLine===l.key);return {...l,name:row.querySelector('[data-name]').value.trim(),quantity:num(row.querySelector('[data-quantity]')?.value)};})});
   const preview=()=>{const d=read(),t=totals(d);body.querySelector('[data-preview]').innerHTML='<b>Consumo por producto</b><ul>'+t.rows.filter(l=>l.name||l.required).map(l=>`<li>${esc(l.label)}: <strong>${fmt(l.total)} ${esc(units[l.unit])}</strong></li>`).join('')+'</ul>'+t.errors.map(e=>`<p>${esc(e)}</p>`).join('');};
   const draw=()=>{body.querySelector('[data-lines]').innerHTML=data.lines.map(l=>`<div class="mfg-recipe-row" data-recipe-line="${esc(l.key)}"><label>${esc(l.label)} ${l.required?'<small>Obligatorio</small>':'<small>Opcional</small>'}<input data-name maxlength="150" value="${esc(l.name||'')}" placeholder="Nombre del componente" ${l.key==='fragrance'?'readonly':''}></label><label>${l.basis==='wick'?'Cantidad de pabilos':esc(bases[l.basis])}${l.basis==='wax'?'<span>Cálculo automático</span>':`<input data-quantity type="number" min="0" step="${l.unit==='unit'||l.basis==='wick'?'1':'any'}" value="${l.quantity??''}">`}<small>${l.basis==='wick'?'Largo total en cm':esc(units[l.unit])}</small></label></div>`).join('');body.querySelector('[data-model-note]').textContent=`Modelo: ${kinds[data.kind]} · versión ${data.template_revision||'propia'}. `+(template&&data.template_revision!==template.revision?'Hay cambios en la categoría. Tu receta conserva sus valores.':'');preview();};draw();
   body.addEventListener('input',preview);body.querySelector('[data-capacity]').onclick=()=>{body.querySelector('[data-measure="fill_ml"]').value=product.capacity_cc??'';preview();box.dispatchEvent(new Event('change',{bubbles:true}));};
   body.querySelector('[data-refresh]').disabled=!template;
   body.querySelector('[data-refresh]').onclick=()=>{data=read();const known=new Set(data.lines.map(l=>l.key));for(const l of template.data.lines)if(!known.has(l.key))data.lines.push({...l,name:l.key==='fragrance'?'Según fragancia elegida':'',quantity:null});data.template_revision=template.revision;draw();body.querySelector('[data-msg]').textContent='Se agregaron los campos nuevos. Se conservaron los renglones y reglas existentes; revisalos antes de guardar.';box.dispatchEvent(new Event('change',{bubbles:true}));};
   body.querySelector('[data-copy]').onclick=async()=>{const source=body.querySelector('[data-copy-source]').value,msg=body.querySelector('[data-msg]');if(!source)return;try{const r=await get('product_manufacturing_recipes','product_id',source);if(!box.isConnected)return;if(!r)return msg.textContent='Ese producto no tiene receta guardada.';data=clone(r.data);data.status='draft';data.category_id=product.category_id;Object.keys(measures).forEach(k=>body.querySelector(`[data-measure="${k}"]`).value=data.measures?.[k]??'');body.querySelector('[data-status]').value='draft';draw();msg.textContent='Copiada al borrador. Revisá y guardá para confirmar.';box.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){msg.textContent=e.message;}};
   const save=async d=>{if(document.getElementById('afCat').value!==product.category_id)throw new Error('Guardá primero el cambio de categoría y volvé a abrir el producto.');record=await put('product_manufacturing_recipes','product_id',id,d,record);data=clone(record.data);};
   saveHandler(box,read,save,'product');body.removeAttribute('aria-busy');
  }catch(e){if(box.isConnected)box.querySelector('.mfg-body').textContent='No se pudo cargar la receta: '+e.message;}
 }
 return {preset,totals,validate,mountCategory,mountProduct,mountFragrance};
})();
const mfgOriginalCategoryForm=categoryForm, mfgOriginalProductForm=productForm, mfgOriginalFragForm=fragForm;
categoryForm=function(id){mfgOriginalCategoryForm(id);Mfg.mountCategory(id);};
productForm=function(id,template){mfgOriginalProductForm(id,template);Mfg.mountProduct(id);};
fragForm=function(id){mfgOriginalFragForm(id);Mfg.mountFragrance(id);};
