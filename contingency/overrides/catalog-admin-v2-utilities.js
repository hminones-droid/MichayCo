/* Micha & Co — shared canonical catalog controls + Excel round-trip */
(function(){
  const rootTemplate=()=>window.__michaCatalogHomeHtml||'';
  if(!window.__michaCatalogHomeHtml){const w=document.getElementById('catalogWorkspace');if(w)window.__michaCatalogHomeHtml=w.innerHTML}

  const yes=v=>/^(si|sí|s|yes|true|1|activo|visible|mostrar)$/i.test(String(v??'').trim());
  const no=v=>/^(no|n|false|0|oculto|inactivo|oculta)$/i.test(String(v??'').trim());
  const bool=(v,def=false)=>String(v??'').trim()===''?def:yes(v)?true:no(v)?false:null;
  const n=(v,{integer=false,min=null}={})=>{if(v===''||v==null)return null;const x=Number(v);if(!Number.isFinite(x)||(integer&&!Number.isInteger(x))||(min!=null&&x<min))return NaN;return x};
  const txt=v=>String(v??'').trim();
  const uuid=()=>crypto.randomUUID();
  const v2Sku=()=>{const t=uuid().replace(/-/g,'').slice(0,12).toUpperCase();return 'V2-'+t.slice(0,6)+'-'+t.slice(6,12)+'-00-00-01'};

  function openCatalogHome(){
    setAdminView('summary','summary');
    const w=adminShell();if(!w)return;
    w.innerHTML=rootTemplate();
    document.querySelectorAll('[data-admin-nav]').forEach(b=>b.classList.remove('active'));
    const group=[...document.querySelectorAll('.admin-nav-group')].find(d=>/catálogo/i.test(d.querySelector('summary')?.textContent||''));group?.setAttribute('open','');
    const cards=[...w.querySelectorAll('.admin-actions button')];
    if(cards[0])cards[0].onclick=()=>openProducts();
    if(cards[1])cards[1].onclick=()=>openSupplies();
    if(cards[2])cards[2].onclick=()=>openFragrances();
    w.scrollIntoView({block:'start'});
  }
  window.openCatalogHome=openCatalogHome;

  function makeCatalogCrumb(root,title){
    const eyebrow=root.querySelector('.catalog-v2-toolbar .eyebrow,.admin-title .eyebrow');if(!eyebrow)return;
    const nav=document.createElement('button');nav.type='button';nav.className='catalog-root-link';nav.innerHTML='← Catálogo';nav.onclick=openCatalogHome;
    eyebrow.replaceWith(nav);
    const h=root.querySelector('.catalog-v2-toolbar h2,.admin-title h2');if(h&&title)h.textContent=title;
  }

  function exportRows(filename,rows){
    if(!window.XLSX){alert('No se pudo cargar Excel.');return}
    const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
    if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};
    XLSX.utils.book_append_sheet(wb,ws,'Catálogo');XLSX.writeFile(wb,filename);
  }

  function resultBox(root){let b=root.querySelector('.catalog-import-result');if(!b){b=document.createElement('div');b.className='catalog-import-result';b.setAttribute('role','status');root.querySelector('.catalog-v2-controls')?.insertAdjacentElement('afterend',b)}return b}
  function report(root,r){const box=resultBox(root);if(!box)return;box.innerHTML='<b>Importación finalizada.</b> '+r.created+' creado(s), '+r.updated+' actualizado(s), '+r.rejected+' rechazado(s).'+(r.errors.length?'<details><summary>Ver errores</summary><ul>'+r.errors.slice(0,50).map(e=>'<li>'+ae(e)+'</li>').join('')+'</ul></details>':'')}

  async function workbookRows(file){
    if(!window.XLSX)throw Error('No se pudo cargar Excel.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),name=wb.SheetNames[0];
    if(!name)throw Error('La planilla no contiene hojas.');
    return XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:'',raw:false});
  }

  const configs={
    products:{
      title:'Productos',file:'michaco-productos.xlsx',table:'products',visible:x=>x.published!==false,
      async load(){await adminLoad();return adminCache.products||[]},
      rows:data=>data.map(p=>({ID:p.id,SKU:p.sku||'',Producto:p.name,Categoria_ID:p.category_id||'',Categoria:p.category?.name||'',Precio:p.price??'',Stock_terminado:p.stock??0,Peso_neto_g:p.net_weight_g??'',Volumen_cc:p.capacity_cc??'',Destacado:p.featured?'Sí':'No',Usa_fragancia:p.uses_fragrance!==false?'Sí':'No',Visible:p.published!==false?'Sí':'No',Orden:p.display_order??0})),
      async parse(row,existing){const id=txt(row.ID),name=txt(row.Producto),cat=txt(row.Categoria_ID);if(!name)return {error:'Producto obligatorio.'};if(!cat||!(adminCache.categories||[]).some(c=>c.id===cat))return {error:'Categoria_ID inexistente u obligatorio.'};const price=n(row.Precio,{min:0}),stock=n(row.Stock_terminado,{integer:true,min:0}),weight=n(row.Peso_neto_g,{min:0}),volume=n(row.Volumen_cc,{min:0}),featured=bool(row.Destacado,false),uses=bool(row.Usa_fragancia,true),published=bool(row.Visible,true),order=n(row.Orden,{integer:true});if([price,stock,weight,volume,order].some(Number.isNaN)||featured===null||uses===null||published===null)return {error:'Revisá números y valores Sí/No.'};const d={name,category_id:cat,price,stock:stock??0,net_weight_g:weight,capacity_cc:volume,featured,uses_fragrance:uses,fragrance_policy:uses?(existing?.fragrance_policy||'all_active'):'none',published,display_order:order??0,short_description:existing?.short_description||null,description:existing?.description||null,slug:existing&&name===existing.name?existing.slug:aslug(name)};if(!id)d.sku=v2Sku();return {id,data:d}},
      refresh:()=>openProducts()
    },
    categories:{
      title:'Categorías',file:'michaco-categorias.xlsx',table:'categories',visible:x=>x.published!==false,
      async load(){await adminLoad();return adminCache.categories||[]},
      rows:data=>data.map(x=>({ID:x.id,Codigo:x.code||'',Categoria:x.name,Visible:x.published!==false?'Sí':'No',Orden:x.display_order??0})),
      async parse(row,existing){const id=txt(row.ID),name=txt(row.Categoria),code=normCode(txt(row.Codigo),2),published=bool(row.Visible,true),order=n(row.Orden,{integer:true});if(!name)return {error:'Categoría obligatoria.'};if(!code)return {error:'Código obligatorio (2 caracteres).'};if(published===null||Number.isNaN(order))return {error:'Visible u Orden inválidos.'};const dup=(adminCache.categories||[]).find(x=>x.id!==id&&(String(x.name).toLowerCase()===name.toLowerCase()||String(x.code||'').toUpperCase()===code));if(dup)return {error:'Nombre o código duplicado.'};return {id,data:{name,code,slug:existing&&name===existing.name?existing.slug:aslug(name),published,display_order:order??0}}},
      refresh:()=>openCategories()
    },
    supplies:{
      title:'Insumos',file:'michaco-insumos.xlsx',table:'supplies',visible:x=>x.active!==false,
      async load(){const {data,error}=await sb.from('supplies').select('*').order('type').order('purchase_name');if(error)throw Error(error.message);return data||[]},
      rows:data=>data.map(x=>({ID:x.id,Codigo:x.code||'',Insumo:x.purchase_name,Tipo:x.type,Unidad:x.stock_unit,Stock:x.stock??0,Stock_minimo:x.min_stock??'',Stock_objetivo:x.target_stock??'',Presentacion_compra:x.purchase_presentation??'',Cantidad_presentacion:x.purchase_quantity??'',Costo_ultima_compra:x.last_purchase_cost??'',Proveedor:x.supplier??'',Material:x.material??'',Color:x.color??'',Capacidad_cc:x.capacity_cc??'',Alto_mm:x.height_mm??'',Ancho_mm:x.width_mm??'',Profundidad_mm:x.depth_mm??'',Diametro_mm:x.diameter_mm??'',Incluye_tapa:x.includes_lid?'Sí':'No',Activo:x.active!==false?'Sí':'No'})),
      async parse(row,existing){let id=txt(row.ID),code=txt(row.Codigo),name=txt(row.Insumo),type=txt(row.Tipo),unit=txt(row.Unidad)||'unit',active=bool(row.Activo,true);if(!name||!type)return {error:'Insumo y Tipo son obligatorios.'};if(!['container','essence','raw_material','accessory','component','presentation'].includes(type))return {error:'Tipo inválido.'};if(!['unit','ml','g','cm'].includes(unit))return {error:'Unidad inválida.'};if(active===null)return {error:'Activo debe ser Sí o No.'};for(const key of ['Stock','Stock_minimo','Stock_objetivo','Cantidad_presentacion','Costo_ultima_compra','Capacidad_cc','Alto_mm','Ancho_mm','Profundidad_mm','Diametro_mm'])if(Number.isNaN(n(row[key],{min:0})))return {error:key+' inválido.'};if(!id&&!code){const cr=await sb.rpc('next_supply_code',{p_type:type});if(cr.error)return {error:'No se pudo generar código: '+cr.error.message};code=cr.data}const container=type==='container',d={code:code||existing?.code,type,purchase_name:name,stock_unit:unit,stock:n(row.Stock,{min:0})??0,min_stock:n(row.Stock_minimo,{min:0}),target_stock:n(row.Stock_objetivo,{min:0}),purchase_presentation:txt(row.Presentacion_compra)||null,purchase_quantity:n(row.Cantidad_presentacion,{min:0}),last_purchase_cost:n(row.Costo_ultima_compra,{min:0}),supplier:txt(row.Proveedor)||null,material:container?(txt(row.Material)||null):null,color:container?(txt(row.Color)||null):null,capacity_cc:container?n(row.Capacidad_cc,{min:0}):null,height_mm:container?n(row.Alto_mm,{min:0}):null,width_mm:container?n(row.Ancho_mm,{min:0}):null,depth_mm:container?n(row.Profundidad_mm,{min:0}):null,diameter_mm:container?n(row.Diametro_mm,{min:0}):null,includes_lid:container?bool(row.Incluye_tapa,false):null,active,description:existing?.description||null,notes:existing?.notes||null};return {id,data:d}},
      refresh:()=>openSupplies()
    },
    fragrances:{
      title:'Fragancias',file:'michaco-fragancias.xlsx',table:'fragrances',visible:x=>x.published!==false,
      async load(){await adminLoad();return adminCache.fragrances||[]},
      rows:data=>data.map(x=>({ID:x.id,Codigo:x.code||'',Fragancia:x.name,Familia_olfativa:x.olfactory_family??'',Descripcion_breve:x.short_description??'',Visible:x.published!==false?'Sí':'No',Orden:x.display_order??0})),
      async parse(row,existing){const id=txt(row.ID),name=txt(row.Fragancia),code=txt(row.Codigo),published=bool(row.Visible,id?true:false),order=n(row.Orden,{integer:true});if(!name||!code)return {error:'Fragancia y Código son obligatorios.'};if(published===null||Number.isNaN(order))return {error:'Visible u Orden inválidos.'};if(!id&&published)return {error:'Una fragancia nueva debe importarse Oculta hasta cargar una fórmula que sume 100%.'};const dup=(adminCache.fragrances||[]).find(x=>x.id!==id&&(String(x.name).toLowerCase()===name.toLowerCase()||String(x.code||'').toUpperCase()===code.toUpperCase()));if(dup)return {error:'Nombre o código duplicado.'};return {id,data:{name,code,slug:existing&&name===existing.name?existing.slug:aslug(name),olfactory_family:txt(row.Familia_olfativa)||null,short_description:txt(row.Descripcion_breve)||null,published,display_order:order??0}}},
      refresh:()=>openFragrances()
    }
  };

  async function importFile(kind,file,root){
    const cfg=configs[kind],box=resultBox(root);if(box)box.textContent='Validando planilla…';
    let rows;try{rows=await workbookRows(file)}catch(e){if(box)box.textContent=e.message;return}
    if(!rows.length){if(box)box.textContent='La planilla está vacía.';return}
    let current;try{current=await cfg.load()}catch(e){if(box)box.textContent='No se pudo leer el catálogo actual: '+e.message;return}
    const byId=new Map(current.map(x=>[String(x.id),x])),plans=[],errors=[];
    for(let i=0;i<rows.length;i++){
      const row=rows[i],id=txt(row.ID),existing=id?byId.get(id):null;
      if(id&&!existing){errors.push('Fila '+(i+2)+': ID inexistente; no se creó una fila nueva.');continue}
      let p;try{p=await cfg.parse(row,existing)}catch(e){p={error:e.message}}
      if(p.error){errors.push('Fila '+(i+2)+': '+p.error);continue}
      plans.push({...p,existing,rowNumber:i+2});
    }
    if(!plans.length){report(root,{created:0,updated:0,rejected:rows.length,errors});return}
    const creates=plans.filter(x=>!x.id).length,updates=plans.length-creates;
    if(!confirm('Importar '+cfg.title+': '+creates+' alta(s), '+updates+' actualización(es), '+errors.length+' rechazo(s).\n\nNo se eliminará ningún registro. ¿Aplicar cambios?')){if(box)box.textContent='Importación cancelada. No se aplicaron cambios.';return}
    let created=0,updated=0,writeErrors=[];
    for(const p of plans){const q=p.id?sb.from(cfg.table).update(p.data).eq('id',p.id):sb.from(cfg.table).insert(p.data);const r=await q;if(r.error)writeErrors.push('Fila '+p.rowNumber+': '+r.error.message);else p.id?updated++:created++}
    const allErrors=[...errors,...writeErrors];report(root,{created,updated,rejected:rows.length-created-updated,errors:allErrors});
    if(!writeErrors.length){setTimeout(()=>cfg.refresh(),800)}
  }

  function addTools(root,kind,{extraSearch=false}={}){
    const cfg=configs[kind];if(!cfg)return;
    let controls=root.querySelector('.catalog-v2-controls');
    if(!controls){controls=document.createElement('div');controls.className='catalog-v2-controls';const toolbar=root.querySelector('.catalog-v2-toolbar');toolbar?.insertAdjacentElement('afterend',controls)}
    if(extraSearch&&!controls.querySelector('input[type="search"]')){const s=document.createElement('input');s.type='search';s.placeholder='Buscar '+cfg.title.toLowerCase();s.className='catalog-shared-search';controls.prepend(s)}
    const box=document.createElement('div');box.className='catalog-v2-actions catalog-v2-shared-tools';
    root.querySelectorAll('.catalog-v2-toolbar>.btn,.catalog-v2-toolbar>.catalog-v2-actions>.btn').forEach(b=>box.appendChild(b));
    const hide=document.createElement('label');hide.className='check catalog-hide-check';hide.innerHTML='<input type="checkbox" data-v2-hide> Ocultar no disponibles';box.appendChild(hide);
    const exp=document.createElement('button');exp.type='button';exp.className='btn secondary';exp.textContent='Exportar Excel';box.appendChild(exp);
    const imp=document.createElement('label');imp.className='btn secondary file-btn';imp.innerHTML='Importar Excel<input hidden type="file" accept=".xlsx,.xls">';box.appendChild(imp);
    controls.appendChild(box);
    exp.onclick=async()=>{try{const data=await cfg.load();exportRows(cfg.file,cfg.rows(data))}catch(e){alert(e.message)}};
    imp.querySelector('input').onchange=e=>{const f=e.target.files[0];if(f)importFile(kind,f,root);e.target.value=''};
    const applyHide=()=>{
      const on=hide.querySelector('input').checked;
      const rows=root.querySelectorAll('.catalog-v2-list .catalog-v2-row');
      rows.forEach(row=>{let unavailable=false;if(kind==='supplies')unavailable=[...row.querySelectorAll('[data-label="Catálogo"]')].some(x=>x.textContent.trim()==='Oculto');else if(kind==='categories'){const cb=row.querySelector('[data-catvisible]');unavailable=cb?!cb.checked:false}else unavailable=[...row.querySelectorAll('[data-label="Tienda"]')].some(x=>/Ocult/i.test(x.textContent));row.hidden=on&&unavailable});
    };
    hide.querySelector('input').onchange=applyHide;
    if(extraSearch){const s=controls.querySelector('.catalog-shared-search');s.oninput=()=>{const q=s.value.trim().toLowerCase();root.querySelectorAll('.catalog-v2-list .catalog-v2-row').forEach(r=>r.style.display=!q||r.textContent.toLowerCase().includes(q)?'':'none');applyHide()}}
    new MutationObserver(applyHide).observe(root.querySelector('.catalog-v2-list')||root,{childList:true,subtree:true});applyHide();
  }

  function enhance(kind,title,extraSearch=false){const root=adminShell();makeCatalogCrumb(root,title);addTools(root,kind,{extraSearch})}
  const op=window.openProducts;window.openProducts=async function(){await op();enhance('products','Productos')};
  const os=window.openSupplies;window.openSupplies=async function(){await os();enhance('supplies','Insumos')};
  const of=window.openFragrances;if(of)window.openFragrances=async function(){await of();enhance('fragrances','Fragancias',true)};
  const oc=window.openCategories;if(oc)window.openCategories=async function(){await oc();enhance('categories','Categorías')};
})();
