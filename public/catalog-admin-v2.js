/* Micha & Co — Catálogo administrativo V2
   Capa de transición: mejora UX sin alterar el contrato público de la tienda. */
(function(){
  const state={categoryFilter:'all',categoryQuery:''};
  const relationStack=[];
  function rememberDraft(root){const values={};root.querySelectorAll('input,select,textarea').forEach(el=>{if(!el.id)return;values[el.id]=el.type==='checkbox'?el.checked:el.value});return values}
  function restoreDraft(values){Object.entries(values||{}).forEach(([id,value])=>{const el=document.getElementById(id);if(!el)return;if(el.type==='checkbox')el.checked=!!value;else el.value=value})}
  window.catalogQuickCreate=function(options){
    const root=adminShell(),draft=rememberDraft(root);relationStack.push({draft,onReturn:options.onReturn});
    const overlay=document.createElement('dialog');overlay.className='catalog-quick-create';overlay.innerHTML='<form method="dialog" class="catalog-quick-card"><header><div><span class="eyebrow">'+ae(options.eyebrow||'CATÁLOGO')+'</span><h3>'+ae(options.title)+'</h3></div><button value="cancel" aria-label="Cerrar">×</button></header><div class="catalog-quick-body"></div></form>';
    document.body.appendChild(overlay);options.render(overlay.querySelector('.catalog-quick-body'),async value=>{overlay.close();overlay.remove();const ctx=relationStack.pop();restoreDraft(ctx.draft);if(ctx.onReturn)await ctx.onReturn(value)});
    overlay.addEventListener('close',()=>{if(overlay.isConnected){overlay.remove();relationStack.pop()}});overlay.showModal();
  };

  function categoryStats(c){
    const products=adminCache.products.filter(p=>p.category_id===c.id);
    const visible=products.filter(p=>p.published!==false);
    const ready=products.filter(p=>{const r=productReadiness(p);return !r.missing.length});
    const stocked=products.filter(p=>productReadiness(p).stock>0);
    const alerts=products.filter(p=>{const r=productReadiness(p);return r.missing.length||r.warnings.length}).length;
    return {products:products.length,visible:visible.length,ready:ready.length,stocked:stocked.length,alerts};
  }

  function categoryMatches(c){
    if(state.categoryQuery&&!String(c.name||'').toLowerCase().includes(state.categoryQuery))return false;
    if(state.categoryFilter==='visible'&&c.published===false)return false;
    if(state.categoryFilter==='hidden'&&c.published!==false)return false;
    if(state.categoryFilter==='pending'&&categoryStats(c).alerts===0)return false;
    if(state.categoryFilter==='ok'&&categoryStats(c).alerts>0)return false;
    return true;
  }

  window.openCategories=async function(){
    setAdminView('categories','categories');await adminLoad();
    const w=adminShell();
    w.innerHTML='<div class="admin-toolbar catalog-v2-toolbar"><div><span class="eyebrow">CATÁLOGO</span><h2>Categorías</h2><p class="admin-help">Familias de producto y estado de su catálogo. La configuración técnica queda fuera de esta vista.</p></div><div class="catalog-v2-actions"><button class="btn" id="newCategory">+ Nueva</button></div></div>'+
      '<div class="catalog-v2-controls"><input id="categorySearch" type="search" placeholder="Buscar categoría"><select id="categoryState" aria-label="Estado"><option value="all">Todos</option><option value="visible">Visibles</option><option value="hidden">Ocultos</option><option value="ok">OK</option><option value="pending">Con pendientes</option></select></div>'+
      '<div class="catalog-v2-head" aria-hidden="true"><span>Categoría</span><span>Productos</span><span>Visibles</span><span>Con stock</span><span>Completos</span><span>Alertas</span><span>Tienda</span><span>Acciones</span></div>'+
      '<div id="categoryList" class="catalog-v2-list"></div>';
    const search=w.querySelector('#categorySearch'),filter=w.querySelector('#categoryState');
    search.value=state.categoryQuery;filter.value=state.categoryFilter;
    search.oninput=()=>{state.categoryQuery=search.value.trim().toLowerCase();renderCategories()};
    filter.onchange=()=>{state.categoryFilter=filter.value;renderCategories()};
    w.querySelector('#newCategory').onclick=()=>categoryForm();
    renderCategories();
  };

  window.renderCategories=function(){
    const list=document.getElementById('categoryList');if(!list)return;
    const rows=adminCache.categories.filter(categoryMatches);
    list.innerHTML=rows.map(c=>{const s=categoryStats(c);return '<article class="catalog-v2-row">'+
      '<button class="catalog-v2-name" data-catedit="'+c.id+'"><b>'+ae(c.name)+'</b><small>'+ae(c.code||'Sin código')+' · orden '+(c.display_order??0)+'</small></button>'+
      '<span data-label="Productos">'+s.products+'</span><span data-label="Visibles">'+s.visible+'</span><span data-label="Con stock">'+s.stocked+'</span><span data-label="Completos">'+s.ready+'</span>'+
      '<span data-label="Alertas"><b class="'+(s.alerts?'v2-warn':'v2-ok')+'">'+s.alerts+'</b></span>'+
      '<label class="visibility-control" data-label="Tienda"><input type="checkbox" data-catvisible="'+c.id+'" '+(c.published!==false?'checked':'')+'><span>Mostrar</span></label>'+
      '<div class="catalog-v2-row-actions"><button class="icon-edit" data-catedit="'+c.id+'" title="Editar" aria-label="Editar">✎</button><button class="icon-trash" data-cattrash="'+c.id+'" data-name="'+ae(c.name)+'" title="Eliminar" aria-label="Eliminar">'+trashIcon()+'</button></div></article>'}).join('')||'<p class="sheet-empty">No hay categorías para este filtro.</p>';
    list.onclick=async e=>{const ed=e.target.closest('[data-catedit]'),v=e.target.closest('[data-catvisible]'),d=e.target.closest('[data-cattrash]');if(ed)return categoryForm(ed.dataset.catedit);if(v){const r=await sb.from('categories').update({published:v.checked}).eq('id',v.dataset.catvisible);if(r.error){alert(r.error.message);await adminLoad();renderCategories()}return}if(d)return deleteCategory(d.dataset.cattrash,d.dataset.name)};
  };

  window.categoryForm=function(id){
    setAdminView('category-form','categories');
    const x=adminCache.categories.find(y=>y.id===id)||{};
    adminShell().innerHTML='<button class="text-link" id="catBack">← Categorías</button><div class="admin-title"><div><span class="eyebrow">CATEGORÍA</span><h2>'+(id?'Editar categoría':'Nueva categoría')+'</h2><p class="admin-help">Sólo datos comerciales. Las reglas de fabricación se incorporarán por tipo sin exponer un constructor técnico.</p></div></div>'+
      '<div class="admin-form catalog-v2-form"><div class="catalog-v2-form-grid"><label>Nombre<input id="catName" value="'+ae(x.name||'')+'" autocomplete="off"></label><label>Orden<input id="catOrder" type="number" value="'+(x.display_order??0)+'"></label></div>'+
      '<label class="check"><input id="catPub" type="checkbox" '+(x.published!==false?'checked':'')+'> Mostrar en la tienda</label>'+
      '<details class="catalog-advanced"><summary>Identificación técnica</summary><p class="admin-help">El código identifica la categoría en los SKU existentes. No lo cambies salvo que sea necesario.</p><label>Código<input id="catCode" maxlength="2" value="'+ae(x.code||'')+'" placeholder="AC"></label></details>'+
      '<div class="catalog-main-actions"><button class="btn" id="catSave">Guardar</button><div id="catMsg" role="status" aria-live="polite"></div></div></div>';
    document.getElementById('catBack').onclick=openCategories;
    const name=document.getElementById('catName'),code=document.getElementById('catCode');
    bindCodeSuggestion(name,code,adminCache.categories,id,[]);
    document.getElementById('catSave').onclick=async()=>{const n=name.value.trim(),c=normCode(code.value,2),msg=document.getElementById('catMsg');const err=catalogValidation(n,c,adminCache.categories,id,[]);if(err){msg.textContent=err;return}const d={name:n,slug:aslug(n),code:c,display_order:Number(document.getElementById('catOrder').value||0),published:document.getElementById('catPub').checked};const r=id?await sb.from('categories').update(d).eq('id',id):await sb.from('categories').insert(d);if(r.error){msg.textContent=r.error.message;return}openCategories()};
  };

  const supplyTypeLabel={container:'Envase',essence:'Esencia',raw_material:'Materia prima',accessory:'Accesorio',presentation:'Presentación'};
  window.openSupplies=async function(){
    setAdminView('supplies','supplies');const w=adminShell();
    const r=await sb.from('supplies').select('*').order('type').order('purchase_name');
    const rows=r.error?[]:(r.data||[]);
    w.innerHTML='<div class="admin-toolbar catalog-v2-toolbar"><div><span class="eyebrow">CATÁLOGO</span><h2>Insumos</h2><p class="admin-help">Envases, esencias, materias primas, accesorios y presentación en un único maestro.</p></div><div class="catalog-v2-actions"><button class="btn" id="newSupply">+ Nuevo</button></div></div>'+
    (r.error?'<p class="catalog-v2-notice">El maestro de Insumos todavía no está habilitado en esta base.</p>':'<div class="catalog-v2-controls"><input id="supplySearch" type="search" placeholder="Buscar insumo"><select id="supplyType"><option value="">Todos los tipos</option>'+Object.entries(supplyTypeLabel).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></div><div id="supplyList" class="catalog-v2-list">'+rows.map(x=>'<article class="catalog-v2-row supply-v2-row"><button class="catalog-v2-name" data-supply="'+x.id+'"><b>'+ae(x.purchase_name)+'</b><small>'+ae(x.code)+' · '+ae(supplyTypeLabel[x.type]||x.type)+'</small></button><span data-label="Stock">'+Number(x.stock||0)+' '+ae(x.stock_unit)+'</span><span data-label="Mínimo">'+(x.min_stock??'—')+'</span><span data-label="Objetivo">'+(x.target_stock??'—')+'</span><span data-label="Costo">'+(x.last_purchase_cost==null?'—':Number(x.last_purchase_cost).toLocaleString('es-AR',{style:'currency',currency:'ARS'}))+'</span><span data-label="Estado">'+(x.active?'Activo':'Oculto')+'</span></article>').join('')+'</div>');
    const b=w.querySelector('#newSupply');if(b)b.onclick=()=>supplyForm();
    const search=w.querySelector('#supplySearch'),type=w.querySelector('#supplyType'),list=w.querySelector('#supplyList');
    if(list)list.onclick=e=>{const b=e.target.closest('[data-supply]');if(b)supplyForm(b.dataset.supply)};
    const draw=()=>{if(!list)return;const q=(search.value||'').toLowerCase(),t=type.value;list.querySelectorAll('.supply-v2-row').forEach((el,i)=>{const x=rows[i];el.hidden=!!((q&&!x.purchase_name.toLowerCase().includes(q))||(t&&x.type!==t))})};if(search)search.oninput=draw;if(type)type.onchange=draw;
  };
  window.supplyForm=async function(id){
    const existing=id?(await sb.from('supplies').select('*').eq('id',id).single()).data:{};
    const x=existing||{},w=adminShell();w.innerHTML='<button class="text-link" id="supplyBack">← Insumos</button><div class="admin-title"><div><span class="eyebrow">INSUMO</span><h2>'+(id?'Editar':'Nuevo insumo')+'</h2></div></div><div class="admin-form catalog-v2-form"><div class="catalog-v2-form-grid"><label>Tipo<select id="supType">'+Object.entries(supplyTypeLabel).map(([k,v])=>'<option value="'+k+'" '+(x.type===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label>Nombre de compra<input id="supName" value="'+ae(x.purchase_name||'')+'"></label><label>Unidad de stock<select id="supUnit">'+['unit','ml','g','cm'].map(v=>'<option '+(x.stock_unit===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label>Stock actual<input id="supStock" type="number" step="0.001" min="0" value="'+(x.stock??0)+'"></label><label>Stock mínimo<input id="supMin" type="number" step="0.001" min="0" value="'+(x.min_stock??'')+'"></label><label>Stock objetivo<input id="supTarget" type="number" step="0.001" min="0" value="'+(x.target_stock??'')+'"></label><label>Presentación de compra<input id="supPresentation" value="'+ae(x.purchase_presentation||'')+'"></label><label>Cantidad por presentación<input id="supQty" type="number" step="0.001" min="0" value="'+(x.purchase_quantity??'')+'"></label><label>Costo última compra<input id="supCost" type="number" step="0.01" min="0" value="'+(x.last_purchase_cost??'')+'"></label><label>Proveedor<input id="supSupplier" value="'+ae(x.supplier||'')+'"></label></div><div id="containerFields" class="catalog-v2-form-grid"><label>Material<input id="supMaterial" value="'+ae(x.material||'')+'"></label><label>Color<input id="supColor" value="'+ae(x.color||'')+'"></label><label>Capacidad cc<input id="supCapacity" type="number" step="0.001" value="'+(x.capacity_cc??'')+'"></label><label>Alto mm<input id="supHeight" type="number" step="0.01" value="'+(x.height_mm??'')+'"></label><label>Ancho mm<input id="supWidth" type="number" step="0.01" value="'+(x.width_mm??'')+'"></label><label>Profundidad mm<input id="supDepth" type="number" step="0.01" value="'+(x.depth_mm??'')+'"></label><label>Diámetro mm<input id="supDiameter" type="number" step="0.01" value="'+(x.diameter_mm??'')+'"></label><label class="check"><input id="supLid" type="checkbox" '+(x.includes_lid?'checked':'')+'> Incluye tapa</label></div><label>Descripción<textarea id="supDesc">'+ae(x.description||'')+'</textarea></label><label>Observaciones<textarea id="supNotes">'+ae(x.notes||'')+'</textarea></label><label class="check"><input id="supActive" type="checkbox" '+(x.active!==false?'checked':'')+'> Activo</label><button class="btn" id="supSave">Guardar</button><div id="supMsg"></div></div>';
    supplyBack.onclick=openSupplies;const toggle=()=>containerFields.hidden=supType.value!=='container';supType.onchange=toggle;toggle();
    supSave.onclick=async()=>{if(!supName.value.trim())return supMsg.textContent='Ingresá el nombre de compra.';let code=x.code;if(!code){const cr=await sb.rpc('next_supply_code',{p_type:supType.value});if(cr.error)return supMsg.textContent=cr.error.message;code=cr.data}const num=id=>{const v=document.getElementById(id).value;return v===''?null:Number(v)};const container=supType.value==='container',d={code,type:supType.value,purchase_name:supName.value.trim(),description:supDesc.value.trim()||null,stock_unit:supUnit.value,stock:Number(supStock.value||0),min_stock:num('supMin'),target_stock:num('supTarget'),purchase_presentation:supPresentation.value.trim()||null,purchase_quantity:num('supQty'),last_purchase_cost:num('supCost'),supplier:supSupplier.value.trim()||null,material:container?supMaterial.value.trim()||null:null,color:container?supColor.value.trim()||null:null,capacity_cc:container?num('supCapacity'):null,height_mm:container?num('supHeight'):null,width_mm:container?num('supWidth'):null,depth_mm:container?num('supDepth'):null,diameter_mm:container?num('supDiameter'):null,includes_lid:container?supLid.checked:null,notes:supNotes.value.trim()||null,active:supActive.checked};const r=id?await sb.from('supplies').update(d).eq('id',id):await sb.from('supplies').insert(d);if(r.error)return supMsg.textContent=r.error.message;openSupplies()};
  };
})();