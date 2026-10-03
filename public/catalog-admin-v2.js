/* Micha & Co — Catálogo administrativo V2
   Capa de transición: mejora UX sin alterar el contrato público de la tienda. */
(function(){
  const state={categoryFilter:'all',categoryQuery:''};

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
})();