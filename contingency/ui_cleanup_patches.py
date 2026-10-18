from __future__ import annotations
import re


def _text(raw: bytes) -> str:
    return raw.decode('utf-8')


def _once(s: str, old: str, new: str, label: str) -> str:
    n=s.count(old)
    if n==1:
        return s.replace(old,new,1)
    if n==0 and new in s:
        return s
    raise RuntimeError(f'ui cleanup {label}: expected 1 occurrence, found {n}')


def _regex_once(s: str, pattern: str, replacement: str, label: str) -> str:
    out,n=re.subn(pattern,replacement,s,count=1,flags=re.S)
    if n==1:return out
    if replacement.strip() in s:return s
    raise RuntimeError(f'ui cleanup {label}: expected 1 regex occurrence, found {n}')


def patch_products(s: str) -> str:
    if 'data-product-delete=' in s and 'canonical-products-head' in s:
        return s
    start=s.index('window.openProducts=async function()')
    end=s.index('window.v2ProductForm=async function',start)
    new=r'''window.openProducts=async function(){
  setAdminView('products','products');
  const ctx=await productCtx(),w=adminShell();
  w.innerHTML='<div class="admin-toolbar catalog-v2-toolbar"><div><span class="eyebrow">CATÁLOGO</span><h2>Productos</h2><p class="admin-help">El nombre visible, color, medidas y capacidad/peso se heredan del componente principal. El producto conserva sólo su nombre base y datos comerciales.</p></div><button class="btn" id="v2NewProduct">+ Nuevo</button></div><div class="catalog-v2-controls"><input id="v2ProductSearch" type="search" placeholder="Buscar producto o categoría"><select id="v2ProductState"><option value="all">Todos</option><option value="complete">Completos</option><option value="incomplete">Incompletos</option><option value="hidden">Ocultos</option></select></div><div class="catalog-v2-head canonical-products-head" aria-hidden="true"><span>Producto</span><span>Precio</span><span>Stock</span><span>Completitud</span><span>Acciones</span></div><div id="v2ProductList" class="catalog-v2-list"></div>';
  const draw=()=>{
    const q=v2ProductSearch.value.trim().toLowerCase(),filter=v2ProductState.value;
    v2ProductList.innerHTML=adminCache.products.filter(p=>{const m=missing(p,ctx),txt=(canonicalName(p,ctx.primary[p.id])+' '+(p.category?.name||'')+' '+physicalSummary(ctx.primary[p.id])).toLowerCase();return(!q||txt.includes(q))&&(filter==='all'||filter==='complete'&&!m.length||filter==='incomplete'&&m.length||filter==='hidden'&&p.published===false)}).map(p=>{
      const m=missing(p,ctx),s=ctx.primary[p.id],pct=Math.round((6-Math.min(6,m.length))/6*100),stock=p.uses_fragrance===false?Number(p.stock||0):Number(ctx.variantStock[p.id]||0),visible=p.published!==false;
      return '<article class="catalog-v2-row product-supply-row canonical-product-row"><button class="catalog-v2-name" data-v2product="'+p.id+'"><b>'+ae(canonicalName(p,s))+'</b><small>'+ae(p.category?.name||'Sin categoría')+' · '+ae(physicalSummary(s))+'</small></button><span data-label="Precio" class="cell-money">'+(p.price==null?'—':Number(p.price).toLocaleString('es-AR',{style:'currency',currency:'ARS'}))+'</span><span data-label="Stock" class="cell-number">'+stock+'</span><span data-label="Completitud"><span class="completion-badge '+(pct===100?'is-complete':'')+'" title="'+ae(m.length?'Falta: '+m.join(', '):'Completo')+'">'+pct+'%</span></span><div class="canonical-row-actions"><label class="visibility-control" title="'+(visible?'Ocultar / inhabilitar':'Mostrar / habilitar')+'"><input type="checkbox" data-visible="'+p.id+'" '+(visible?'checked':'')+'><span>Visible</span></label><button type="button" class="icon-edit" data-v2product="'+p.id+'" title="Editar" aria-label="Editar">✎</button><button type="button" class="icon-edit" data-product-duplicate="'+p.id+'" title="Duplicar" aria-label="Duplicar">⧉</button><button type="button" class="icon-trash" data-product-delete="'+p.id+'" data-name="'+ae(canonicalName(p,s))+'" title="Eliminar" aria-label="Eliminar">'+(typeof trashIcon==='function'?trashIcon():'🗑')+'</button></div></article>';
    }).join('')||'<p class="sheet-empty">No hay productos para este filtro.</p>';
    w.querySelectorAll('[data-v2product]').forEach(b=>b.onclick=()=>v2ProductForm(b.dataset.v2product));
  };
  v2ProductList.onclick=e=>{const d=e.target.closest('[data-product-delete]');if(d){e.preventDefault();e.stopPropagation();return deleteProduct(d.dataset.productDelete,d.dataset.name)}};
  v2NewProduct.onclick=()=>v2ProductForm();v2ProductSearch.oninput=draw;v2ProductState.onchange=draw;draw();
};
'''
    return s[:start]+new+s[end:]


def patch_fragrances(s: str) -> str:
    if 'data-fragrance-delete=' in s and 'canonical-fragrances-head' in s:
        return s
    start=s.index('window.openFragrances=async function()')
    end=s.index('window.v2FragranceForm=async function',start)
    new=r'''window.openFragrances=async function(){
  setAdminView('fragrances','fragrances');await adminLoad();
  const [cr,sr]=await Promise.all([sb.from('fragrance_compositions').select('*'),sb.from('supplies').select('id,purchase_name').eq('type','essence')]);
  if(cr.error||sr.error)throw new Error('No se pudieron cargar las composiciones.');
  const comps=new Map((cr.data||[]).map(x=>[x.fragrance_id,x.data])),essNames=new Map((sr.data||[]).map(x=>[x.id,x.purchase_name])),w=adminShell();
  w.innerHTML='<div class="admin-toolbar catalog-v2-toolbar"><div><span class="eyebrow">CATÁLOGO</span><h2>Fragancias</h2><p class="admin-help">Cada fragancia es una fórmula comercial vinculada a insumos de tipo Esencia (ESC).</p></div><button class="btn" id="v2NewFrag">+ Nueva</button></div><div class="catalog-v2-head canonical-fragrances-head" aria-hidden="true"><span>Fragancia</span><span>Composición</span><span>Completitud</span><span>Acciones</span></div><div class="catalog-v2-list" id="v2FragList">'+adminCache.fragrances.map(f=>{const l=linesOf(comps.get(f.id)),total=l.reduce((a,x)=>a+Number(x.percent||0),0),ok=l.length&&Math.abs(total-100)<.001,visible=f.published!==false;return '<article class="catalog-v2-row product-supply-row canonical-fragrance-row"><button class="catalog-v2-name" data-v2frag="'+f.id+'"><b>'+ae(f.name)+'</b><small>'+ae(f.olfactory_family||'Familia sin definir')+'</small></button><span data-label="Composición"><b>'+l.length+' esencia(s)</b><small>'+ae(l.map(x=>(x.name||essNames.get(x.supply_id)||'Esencia')+' '+Number(x.percent||0)+'%').join(' · ')||'Sin fórmula')+'</small></span><span data-label="Completitud"><span class="completion-badge '+(ok?'is-complete':'')+'" title="'+(ok?'Fórmula completa':'La fórmula debe sumar 100%')+'">'+Math.max(0,Math.min(100,Math.round(total)))+'%</span></span><div class="canonical-row-actions"><label class="visibility-control" title="'+(visible?'Ocultar / inhabilitar':'Mostrar / habilitar')+'"><input type="checkbox" data-visible="'+f.id+'" '+(visible?'checked':'')+'><span>Visible</span></label><button type="button" class="icon-edit" data-v2frag="'+f.id+'" title="Editar" aria-label="Editar">✎</button><button type="button" class="icon-trash" data-fragrance-delete="'+f.id+'" data-name="'+ae(f.name)+'" title="Eliminar" aria-label="Eliminar">'+(typeof trashIcon==='function'?trashIcon():'🗑')+'</button></div></article>'}).join('')+'</div>';
  v2NewFrag.onclick=()=>v2FragranceForm();w.querySelectorAll('[data-v2frag]').forEach(b=>b.onclick=()=>v2FragranceForm(b.dataset.v2frag));
  v2FragList.onclick=e=>{const d=e.target.closest('[data-fragrance-delete]');if(d){e.preventDefault();e.stopPropagation();return deleteFragrance(d.dataset.fragranceDelete,d.dataset.name)}};
};
'''
    return s[:start]+new+s[end:]


def patch_catalog(s: str) -> str:
    if 'data-supply-delete=' not in s.split('window.supplyForm',1)[0]:
        old="""const draw=()=>{const list=document.getElementById('supplyList');if(!list)return;list.innerHTML=filtered().map(x=>'<article class=\"catalog-v2-row supply-v2-row\" data-active=\"'+(x.active!==false?'1':'0')+'\"><button class=\"catalog-v2-name\" data-supply=\"'+x.id+'\"><b>'+ae(x.purchase_name)+'</b><small>'+ae(x.code)+' · '+ae(supplyTypeLabel[x.type]||x.type)+'</small></button><span data-label=\"Stock\">'+Number(x.stock||0)+' '+ae(x.stock_unit)+'</span><span data-label=\"Usado en\">'+(usage[x.id]||0)+' producto(s)</span><span data-label=\"Costo unit.\">'+money(unitCost(x))+'</span><span data-label=\"Estado\"><b class=\"'+(supplyStatus(x)==='OK'?'v2-ok':'v2-warn')+'\">'+supplyStatus(x)+'</b></span></article>').join('')||'<p class=\"sheet-empty\">No hay insumos para este filtro.</p>';list.onclick=e=>{const b=e.target.closest('[data-supply]');if(b)supplyForm(b.dataset.supply)}};"""
        new="""const draw=()=>{const list=document.getElementById('supplyList');if(!list)return;list.innerHTML=filtered().map(x=>'<article class=\"catalog-v2-row supply-v2-row\" data-active=\"'+(x.active!==false?'1':'0')+'\"><button class=\"catalog-v2-name\" data-supply=\"'+x.id+'\"><b>'+ae(x.purchase_name)+'</b><small>'+ae(x.code)+' · '+ae(supplyTypeLabel[x.type]||x.type)+'</small></button><span data-label=\"Stock\">'+Number(x.stock||0)+' '+ae(x.stock_unit)+'</span><span data-label=\"Usado en\">'+(usage[x.id]||0)+' producto(s)</span><span data-label=\"Costo unit.\">'+money(unitCost(x))+'</span><span data-label=\"Estado stock\"><b class=\"'+(supplyStatus(x)==='OK'?'v2-ok':'v2-warn')+'\">'+supplyStatus(x)+'</b></span><span class=\"supply-v2-actions\" data-label=\"Acciones\"><button type=\"button\" data-supply-active=\"'+x.id+'\" class=\"'+(x.active!==false?'is-active':'')+'\" title=\"'+(x.active!==false?'Inhabilitar / ocultar':'Habilitar / mostrar')+'\" aria-label=\"Cambiar vigencia\">✓</button><button type=\"button\" data-supply-edit=\"'+x.id+'\" title=\"Editar\" aria-label=\"Editar\">✎</button><button type=\"button\" data-supply-duplicate=\"'+x.id+'\" title=\"Duplicar\" aria-label=\"Duplicar\">⧉</button><button type=\"button\" data-supply-delete=\"'+x.id+'\" title=\"Borrar\" aria-label=\"Borrar\">🗑</button></span></article>').join('')||'<p class=\"sheet-empty\">No hay insumos para este filtro.</p>';list.onclick=e=>{const b=e.target.closest('[data-supply]');if(b)supplyForm(b.dataset.supply)}};"""
        s=_once(s,old,new,'supply rows')
    if '<span>Estado stock</span><span>Acciones</span>' not in s:
        s=_once(s,'<span>Estado</span></div><div id="supplyList"','<span>Estado stock</span><span>Acciones</span></div><div id="supplyList"','supply head')
    return s


def patch_fixes(s: str) -> str:
    s=s.replace("  new MutationObserver(()=>queueMicrotask(reconcileCanonicalList)).observe(document.documentElement,{childList:true,subtree:true});\n\n","")
    s=s.replace("    if(active==='products')labels=['Producto','Precio','Stock','Visible','Completitud','Acciones'];","    if(active==='products')labels=['Producto','Precio','Stock','Completitud','Acciones'];")
    return s


def patch_utilities(s: str) -> str:
    return s.replace("    new MutationObserver(()=>queueMicrotask(applyFilters)).observe(root.querySelector('.catalog-v2-list')||root,{childList:true,subtree:true});\n","")


def patch_duplicate(s: str) -> str:
    old="""  new MutationObserver(()=>queueMicrotask(()=>{decorateV2Products();decorateComponentRows()})).observe(document.documentElement,{childList:true,subtree:true});
  queueMicrotask(()=>{decorateV2Products();decorateComponentRows()});
"""
    new="""  const originalOpenProductSupplies=window.openProductSupplies;
  if(typeof originalOpenProductSupplies==='function'){window.openProductSupplies=async function(...args){const r=await originalOpenProductSupplies.apply(this,args);queueMicrotask(decorateComponentRows);return r}}
  queueMicrotask(decorateComponentRows);
"""
    if old in s:return s.replace(old,new,1)
    return s


def patch_dashboard(s: str) -> str:
    marker='\n(function(){const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];function row'
    i=s.find(marker)
    return s if i<0 else s[:i]+'\n'


def patch_canonical_js(s: str) -> str:
    if "const list=$('#v2ProductList',root);if(!list)return false;\n    root.classList.add('canonical-table-screen');ensureHead(root,['Producto','Precio','Stock','Completitud','Acciones'],'canonical-products-head');return true;" not in s:
        s,n=re.subn(r"  function productScreen\(root\)\{.*?\n  function categoryScreen", "  function productScreen(root){\n    const list=$('#v2ProductList',root);if(!list)return false;\n    root.classList.add('canonical-table-screen');ensureHead(root,['Producto','Precio','Stock','Completitud','Acciones'],'canonical-products-head');return true;\n  }\n  function categoryScreen", s, count=1, flags=re.S)
        if n!=1:raise RuntimeError('ui cleanup canonical productScreen')
    if "const list=$('#v2FragList',root);if(!list)return false;root.classList.add('canonical-table-screen');ensureHead(root,['Fragancia','Composición','Completitud','Acciones'],'canonical-fragrances-head');return true;" not in s:
        s,n=re.subn(r"  function fragranceScreen\(root\)\{.*?\n  function photoPage", "  function fragranceScreen(root){\n    const list=$('#v2FragList',root);if(!list)return false;root.classList.add('canonical-table-screen');ensureHead(root,['Fragancia','Composición','Completitud','Acciones'],'canonical-fragrances-head');return true;\n  }\n  function photoPage", s, count=1, flags=re.S)
        if n!=1:raise RuntimeError('ui cleanup canonical fragranceScreen')
    return s


def patch_canonical_css(s: str) -> str:
    s=s.replace('grid-template-columns:minmax(360px,1fr) 120px 62px 62px 76px 128px!important','grid-template-columns:minmax(360px,1fr) 120px 62px 76px 140px!important')
    s=s.replace('#v2ProductList .canonical-product-row>.canonical-row-actions{grid-column:6!important','#v2ProductList .canonical-product-row>.canonical-row-actions{grid-column:5!important')
    return s


def patch_admin_tools(s: str) -> str:
    s=s.replace("gridHead.innerHTML='<tr><th>Fragancia</th><th>Familia</th><th>Stock actual</th><th>Cantidad</th><th>SKU completo</th></tr>';","gridHead.innerHTML='<tr><th>Fragancia</th><th>Familia</th><th>Stock</th><th>SKU completo</th></tr>';")
    old="""stockBody.innerHTML=fltPositive.checked&&stock<=0?'<tr><td colspan=\"4\" class=\"sheet-empty\">Sin resultados.</td></tr>':'<tr data-na-product=\"'+p.id+'\"><td><b>N/A</b><small class=\"cell-sub\">Sin fragancia</small></td><td>—</td><td><b>'+stock+'</b></td><td><input class=\"cell-stock matrix-stock\" data-current=\"'+stock+'\" type=\"number\" min=\"0\" placeholder=\"0\"></td><td><small>'+ae(p.sku+'-NA')+'</small></td></tr>'"""
    new="""stockBody.innerHTML=fltPositive.checked&&stock<=0?'<tr><td colspan=\"4\" class=\"sheet-empty\">Sin resultados.</td></tr>':'<tr data-na-product=\"'+p.id+'\"><td><b>N/A</b><small class=\"cell-sub\">Sin fragancia</small></td><td>—</td><td><input class=\"cell-stock matrix-stock\" data-current=\"'+stock+'\" type=\"number\" min=\"0\" value=\"'+stock+'\"></td><td><small>'+ae(p.sku+'-NA')+'</small></td></tr>'"""
    if old in s:s=s.replace(old,new,1)
    s=s.replace("adminCache.products.filter(p=>genericSku(p)).map(p=>'<option value=\"'+p.id+'\">'+ae(photoProductLabel(p))+'</option>').join('')","adminCache.products.filter(p=>genericSku(p)).map(p=>'<option value=\"'+p.id+'\">'+ae(window.productCanonicalName?productCanonicalName(p):p.name)+'</option>').join('')")
    s=s.replace('<label><input id="galleryMissing" type="checkbox"> Sin fotos</label><button type="button" id="allArticlePhotos">Ver todos los artículos</button>','<label><input id="galleryMissing" type="checkbox"> Sin fotos</label>')
    s=s.replace("photoBack.onclick=openProducts;photoGallerySearch.oninput=renderPhotoGrid;galleryMissing.onchange=renderPhotoGrid;allArticlePhotos.onclick=()=>{photoGalleryProductId=null;photoGallerySearch.value=\"\";galleryMissing.checked=false;renderPhotoGrid()};","photoBack.onclick=openProducts;photoGallerySearch.oninput=renderPhotoGrid;galleryMissing.onchange=()=>{if(!galleryMissing.checked)photoGalleryProductId=null;renderPhotoGrid()};")
    return s


PATCHERS={
 '/catalog-admin-v2-products.js':patch_products,
 '/catalog-admin-v2-fragrances.js':patch_fragrances,
 '/catalog-admin-v2.js':patch_catalog,
 '/catalog-admin-v2-fixes.js':patch_fixes,
 '/catalog-admin-v2-utilities.js':patch_utilities,
 '/product-duplicate-fixes.js':patch_duplicate,
 '/dashboard-data-fix.js':patch_dashboard,
 '/canonical-admin-ui.js':patch_canonical_js,
 '/canonical-admin-ui.css':patch_canonical_css,
 '/admin-tools.js':patch_admin_tools,
}


def apply(route: str, raw: bytes) -> bytes:
    fn=PATCHERS.get(route)
    if not fn:return raw
    return fn(_text(raw)).encode('utf-8')
