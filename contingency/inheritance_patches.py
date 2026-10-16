from pathlib import Path


def replace_once(s, old, new, label):
    n=s.count(old)
    if n == 1:
        return s.replace(old,new,1)
    if n == 0 and new in s:
        return s
    raise RuntimeError(f'{label}: expected 1 occurrence, found {n}')


def patch_catalog(s):
    s=replace_once(s,
      '<label>Capacidad cc<input id="supCapacity" type="number" step="0.001" value="\'+(x.capacity_cc??\'\')+\'"></label><label>Alto mm',
      '<label>Capacidad líquida cc<input id="supCapacity" type="number" step="0.001" min="0" value="\'+(x.capacity_cc??\'\')+\'"></label><label>Capacidad útil / peso neto g<input id="supCapacityG" type="number" step="0.001" min="0" value="\'+(x.capacity_g??\'\')+\'"><small class="admin-help">Para velas, peso neto que admite este envase. El producto lo hereda.</small></label><label>Alto mm',
      'supply capacity field')
    s=replace_once(s,"const toggle=()=>containerFields.hidden=supType.value!=='container';","const toggle=()=>containerFields.hidden=!['container','component'].includes(supType.value);",'physical toggle')
    s=replace_once(s,"const container=supType.value==='container',d={","const physical=['container','component'].includes(supType.value),d={",'physical save flag')
    s=replace_once(s,"material:container?supMaterial.value.trim()||null:null,color:container?supColor.value.trim()||null:null,capacity_cc:container?num('supCapacity'):null,height_mm:container?num('supHeight'):null,width_mm:container?num('supWidth'):null,depth_mm:container?num('supDepth'):null,diameter_mm:container?num('supDiameter'):null,includes_lid:container?supLid.checked:null","material:physical?supMaterial.value.trim()||null:null,color:physical?supColor.value.trim()||null:null,capacity_cc:physical?num('supCapacity'):null,capacity_g:physical?num('supCapacityG'):null,height_mm:physical?num('supHeight'):null,width_mm:physical?num('supWidth'):null,depth_mm:physical?num('supDepth'):null,diameter_mm:physical?num('supDiameter'):null,includes_lid:physical?supLid.checked:null",'physical save fields')
    s=s.replace("<h2>'+ae(p.name)+'</h2>","<h2>'+ae(window.productCanonicalName?productCanonicalName(p):p.name)+'</h2>")
    s=s.replace("← Componentes de '+ae(product.name)+'","← Componentes de '+ae(window.productCanonicalName?productCanonicalName(product):product.name)+'")

    old_query="sb.from('product_supplies').select('*,supply:supplies!product_supplies_supply_id_fkey(id,code,purchase_name,type,stock_unit),content_container:supplies!product_supplies_content_container_supply_id_fkey(id,code,purchase_name)').eq('product_id',productId).order('display_order')"
    new_query="sb.from('product_supplies').select('*,supply:supplies!product_supplies_supply_id_fkey(id,code,purchase_name,type,stock_unit,material,color,capacity_cc,capacity_g,height_mm,width_mm,depth_mm,diameter_mm),content_container:supplies!product_supplies_content_container_supply_id_fkey(id,code,purchase_name)').eq('product_id',productId).order('display_order')"
    s=replace_once(s,old_query,new_query,'product supply physical query')

    helpers="""  function recipeNorm(v){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ').trim()}\n  function recipeNumber(v){return Number(v).toLocaleString('es-AR',{maximumFractionDigits:3})}\n  function recipeUnit(unit,fallback){return ({ml:'ml',cc:'cc',g:'g',cm:'cm',mm:'mm',unit:'un'}[unit]||fallback||unit||'').trim()}\n  function productSupplyCalculatedLabel(link,links,product){\n    const unit=link.supply?.stock_unit||'';\n    if(link.quantity!=null)return recipeNumber(link.quantity)+' '+recipeUnit(unit,unit);\n    const primary=(links.find(x=>x.role==='primary'&&x.supply)||{}).supply;if(!primary)return 'Calculada';\n    if(link.quantity_rule==='by_length'&&primary.height_mm!=null){const mm=Number(primary.height_mm);if(!Number.isFinite(mm))return 'Calculada';const v=unit==='mm'?mm:mm/10;return recipeNumber(v)+' '+recipeUnit(unit,unit==='mm'?'mm':'cm')}\n    if(link.quantity_rule==='by_capacity'){let v=null;if(unit==='g')v=primary.capacity_g;else if(unit==='ml'||unit==='cc')v=primary.capacity_cc;else v=primary.capacity_g??primary.capacity_cc;if(v!=null&&Number.isFinite(Number(v)))return recipeNumber(Number(v))+' '+recipeUnit(unit,primary.capacity_g!=null?'g':'cc');return 'Calculada'}\n    if(link.quantity_rule!=='by_recipe')return 'Calculada';\n    const category=recipeNorm(product?.category?.name||'');if(!category.includes('vela'))return 'Calculada';\n    const base=Number(primary.capacity_g);if(!Number.isFinite(base)||base<=0)return 'Calculada';\n    const name=recipeNorm((link.supply?.purchase_name||'')+' '+(link.supply?.code||''));\n    if(name.includes('cera'))return recipeNumber(base)+' '+recipeUnit(unit,'g');\n    if(name.includes('estabilizador')||name.includes('catalizador'))return recipeNumber(base*0.025)+' '+recipeUnit(unit,'g');\n    if(name.includes('esencia')||name.includes('fragancia'))return recipeNumber(base*0.05)+' '+recipeUnit(unit,'cc');\n    return 'Calculada';\n  }\n"""
    marker="  window.openProductSupplies=async function(productId){"
    if 'function productSupplyCalculatedLabel(' not in s:
        s=replace_once(s,marker,helpers+marker,'recipe calculation helpers')

    old_qty="<span data-label=\"Cantidad\">'+(l.quantity??'Calculada')+' '+ae(l.supply?.stock_unit||'')+'</span>"
    new_qty="<span data-label=\"Cantidad\">'+ae(productSupplyCalculatedLabel(l,links,p))+'</span>"
    s=replace_once(s,old_qty,new_qty,'calculated component quantity display')
    return s


def patch_utilities(s):
    s=replace_once(s,"rows:data=>data.map(p=>({ID:p.id,SKU:p.sku||'',Producto:p.name,Categoria_ID:p.category_id||'',Categoria:p.category?.name||'',Precio:p.price??'',Stock_terminado:p.stock??0,Peso_neto_g:p.net_weight_g??'',Volumen_cc:p.capacity_cc??'',Destacado:p.featured?'Sí':'No',Usa_fragancia:p.uses_fragrance!==false?'Sí':'No',Visible:p.published!==false?'Sí':'No',Orden:p.display_order??0}))","rows:data=>data.map(p=>({ID:p.id,SKU:p.sku||'',Producto_base:p.name,Nombre_visible:window.productCanonicalName?productCanonicalName(p):p.name,Categoria_ID:p.category_id||'',Categoria:p.category?.name||'',Precio:p.price??'',Stock_terminado:p.stock??0,Caracteristicas_heredadas:window.productInheritedPhysicalSummary?productInheritedPhysicalSummary(p):'',Destacado:p.featured?'Sí':'No',Usa_fragancia:p.uses_fragrance!==false?'Sí':'No',Visible:p.published!==false?'Sí':'No',Orden:p.display_order??0}))",'product export')
    old="async parse(row,existing){const id=txt(row.ID),name=txt(row.Producto),cat=txt(row.Categoria_ID);if(!name)return {error:'Producto obligatorio.'};if(!cat||!(adminCache.categories||[]).some(c=>c.id===cat))return {error:'Categoria_ID inexistente u obligatorio.'};const price=n(row.Precio,{min:0}),stock=n(row.Stock_terminado,{integer:true,min:0}),weight=n(row.Peso_neto_g,{min:0}),volume=n(row.Volumen_cc,{min:0}),featured=bool(row.Destacado,false),uses=bool(row.Usa_fragancia,true),published=bool(row.Visible,true),order=n(row.Orden,{integer:true});if([price,stock,weight,volume,order].some(Number.isNaN)||featured===null||uses===null||published===null)return {error:'Revisá números y valores Sí/No.'};const d={name,category_id:cat,price,stock:stock??0,net_weight_g:weight,capacity_cc:volume,featured,uses_fragrance:uses,fragrance_policy:uses?(existing?.fragrance_policy||'all_active'):'none',published,display_order:order??0,short_description:existing?.short_description||null,description:existing?.description||null,slug:existing&&name===existing.name?existing.slug:aslug(name)};if(!id)d.sku=v2Sku();return {id,data:d}}"
    new="async parse(row,existing){const id=txt(row.ID),name=txt(row.Producto_base)||txt(row.Producto),cat=txt(row.Categoria_ID);if(!name)return {error:'Producto_base obligatorio.'};if(!cat||!(adminCache.categories||[]).some(c=>c.id===cat))return {error:'Categoria_ID inexistente u obligatorio.'};const price=n(row.Precio,{min:0}),stock=n(row.Stock_terminado,{integer:true,min:0}),featured=bool(row.Destacado,false),uses=bool(row.Usa_fragancia,true),published=bool(row.Visible,true),order=n(row.Orden,{integer:true});if([price,stock,order].some(Number.isNaN)||featured===null||uses===null||published===null)return {error:'Revisá números y valores Sí/No.'};const d={name,category_id:cat,price,stock:stock??0,featured,uses_fragrance:uses,fragrance_policy:uses?(existing?.fragrance_policy||'all_active'):'none',published,display_order:order??0,short_description:existing?.short_description||null,description:existing?.description||null,slug:existing&&name===existing.name?existing.slug:aslug(name)};if(!id)d.sku=v2Sku();return {id,data:d}}"
    s=replace_once(s,old,new,'product import')
    s=replace_once(s,"Color:x.color??'',Capacidad_cc:x.capacity_cc??'',Alto_mm","Color:x.color??'',Capacidad_cc:x.capacity_cc??'',Capacidad_g:x.capacity_g??'',Alto_mm",'supply export capacity_g')
    s=replace_once(s,"'Costo_ultima_compra','Capacidad_cc','Alto_mm'","'Costo_ultima_compra','Capacidad_cc','Capacidad_g','Alto_mm'",'supply validate capacity_g')
    s=replace_once(s,"const container=type==='container',d={","const physical=['container','component'].includes(type),d={",'supply import physical flag')
    s=replace_once(s,"material:container?(txt(row.Material)||null):null,color:container?(txt(row.Color)||null):null,capacity_cc:container?n(row.Capacidad_cc,{min:0}):null,height_mm:container?n(row.Alto_mm,{min:0}):null,width_mm:container?n(row.Ancho_mm,{min:0}):null,depth_mm:container?n(row.Profundidad_mm,{min:0}):null,diameter_mm:container?n(row.Diametro_mm,{min:0}):null,includes_lid:container?bool(row.Incluye_tapa,false):null","material:physical?(txt(row.Material)||null):null,color:physical?(txt(row.Color)||null):null,capacity_cc:physical?n(row.Capacidad_cc,{min:0}):null,capacity_g:physical?n(row.Capacidad_g,{min:0}):null,height_mm:physical?n(row.Alto_mm,{min:0}):null,width_mm:physical?n(row.Ancho_mm,{min:0}):null,depth_mm:physical?n(row.Profundidad_mm,{min:0}):null,diameter_mm:physical?n(row.Diametro_mm,{min:0}):null,includes_lid:physical?bool(row.Incluye_tapa,false):null",'supply import physical fields')
    return s


def patch_app(s):
    s=replace_once(s,"let products=[],variants=[],images=[],fragrances=[],categories=[],siteContent={},cart=","let products=[],variants=[],images=[],fragrances=[],categories=[],primaryPhysical={},siteContent={},cart=",'app state')
    s=replace_once(s,"let [rows,contentRows,categoryRows,variantRows,imageRows,fragranceRows]=await Promise.all([","let [rows,contentRows,categoryRows,variantRows,imageRows,fragranceRows,physicalRows]=await Promise.all([",'app fetch tuple')
    s=replace_once(s,"api('/fragrances?select=id,name,code,short_description,olfactory_family,discovery_moments&published=eq.true&order=display_order.asc')\n  ]);","api('/fragrances?select=id,name,code,short_description,olfactory_family,discovery_moments&published=eq.true&order=display_order.asc'),\n   api('/storefront_product_physical?select=*')\n  ]);",'app physical fetch')
    s=replace_once(s,"products=rows.map(p=>({...p,category:p.category?.name||'Colección'}));","primaryPhysical=Object.fromEntries((physicalRows||[]).map(x=>[String(x.product_id),x]));\n  products=rows.map(p=>({...p,category:p.category?.name||'Colección'}));",'app physical map')
    helpers="""function productPrimary(p){return p?primaryPhysical[String(p.id)]||null:null}\nfunction metaKey(v){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ').trim()}\nfunction defaultPhysicalColor(v){return ['','transparente','incoloro','clear','cristal'].includes(metaKey(v))}\nfunction productDisplayName(p){if(!p)return'';let base=String(p.name||'').trim(),s=productPrimary(p),suffix='';if(s){let color=String(s.color||'').trim();if(color&&!defaultPhysicalColor(color))suffix=color;else if(!color&&s.purchase_name&&String(s.purchase_name).toLocaleLowerCase('es').startsWith(base.toLocaleLowerCase('es')))suffix=String(s.purchase_name).slice(base.length).replace(/^\\s*[-–—·/]?\\s*/,'').trim()}return suffix&&!metaKey(base).includes(metaKey(suffix))?base+' '+suffix:base}\nfunction physicalDims(s){if(!s)return'';let n=v=>Number(v).toLocaleString('es-AR',{maximumFractionDigits:2});if(s.diameter_mm&&s.height_mm)return 'Ø '+n(s.diameter_mm)+' × '+n(s.height_mm)+' mm';let a=[];if(s.height_mm)a.push('alto '+n(s.height_mm));if(s.width_mm)a.push('ancho '+n(s.width_mm));if(s.depth_mm)a.push('prof. '+n(s.depth_mm));return a.length?a.join(' × ')+' mm':''}\n"""
    if 'function productPrimary(p)' not in s:
        s=replace_once(s,'function sanitizeCart(){',helpers+'function sanitizeCart(){','app helpers')
    s=replace_once(s,"function productMeta(p){return [p.color,p.capacity_cc!=null?p.capacity_cc+' cc':null].filter(Boolean).join(' · ')}","function productMeta(p){let s=productPrimary(p),a=[];if(s?.capacity_g!=null)a.push(Number(s.capacity_g).toLocaleString('es-AR',{maximumFractionDigits:2})+' g');if(s?.capacity_cc!=null)a.push(Number(s.capacity_cc).toLocaleString('es-AR',{maximumFractionDigits:2})+' cc');let d=physicalDims(s);if(d)a.push(d);return a.join(' · ')}",'app meta')
    s=s.replace("aromaText(p.name)","aromaText(productDisplayName(p))")
    s=s.replace("alt=\"'+p.name+'\"","alt=\"'+productDisplayName(p)+'\"")
    s=s.replace("<h3>${p.name}</h3>","<h3>${productDisplayName(p)}</h3>")
    s=s.replace("$('variantTitle').textContent=p.name;","$('variantTitle').textContent=productDisplayName(p);")
    s=s.replace("<span>${p.name}${productMeta(p)?","<span>${productDisplayName(p)}${productMeta(p)?")
    s=s.replace("aria-label=\"Eliminar ${p.name}\"","aria-label=\"Eliminar ${productDisplayName(p)}\"")
    s=s.replace("'<li>'+p.name+(productMeta(p)?","'<li>'+productDisplayName(p)+(productMeta(p)?")
    s=s.replace("let available=fragrances.filter(f=>variants.some(v=>Number(v.stock)>0&&String(v.fragrance?.id)===String(f.id)&&storefrontReady(products.find(p=>String(p.id)===String(v.product_id)))));","let available=fragrances.filter(f=>(f.discovery_moments||[]).length); // discovery remains browsable even when finished stock is zero")
    s=s.replace("let w=aromaWorlds[index],list=fragrances.filter(f=>(f.discovery_moments||[]).includes(w.name)&&availableAromaVariants(f.id).length),box=$('aromaResults');if(!box||!list.length)return;","let w=aromaWorlds[index],list=fragrances.filter(f=>(f.discovery_moments||[]).includes(w.name)),box=$('aromaResults');if(!box||!list.length)return;")
    s=s.replace("let av=availableAromaVariants(f.id),ps=[...new Map(av.map(v=>{let p=products.find(x=>String(x.id)===String(v.product_id));return [String(p.id),p]})).values()];if(!ps.length)return;","let av=availableAromaVariants(f.id),ps=[...new Map(av.map(v=>{let p=products.find(x=>String(x.id)===String(v.product_id));return [String(p.id),p]})).values()];if(!ps.length){document.querySelectorAll('.aroma-pick').forEach(x=>{let active=x.dataset.aromaFragrance===String(f.id);x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});host.innerHTML='<div class=\"aroma-focus-copy\"><span class=\"eyebrow\">'+aromaText(f.olfactory_family||'FRAGANCIA')+'</span><h4>'+aromaText(f.name)+'</h4><p>'+aromaText(f.short_description||'Una nueva forma de vivir este momento.')+'</p><small>Sin presentaciones con stock por ahora. Podés seguir explorando otros aromas.</small></div>';return;}")
    return s


def patch_admin(s):
    marker='<button data-admin-nav="fragrances">Fragancias</button><button data-admin-nav="photos">Fotos</button>'
    repl='<button data-admin-nav="fragrances">Fragancias</button><button data-admin-nav="variants">Stock</button><button data-admin-nav="photos">Fotos</button>'
    return replace_once(s,marker,repl,'stock nav')


def patch_admin_tools(s):
    s=s.replace('<h2>Precios y stock</h2><p class="admin-help">Precio por SKU genérico. Stock por presentación/color + fragancia.</p>','<h2>Stock</h2><p class="admin-help">Inventario de producto terminado por presentación y fragancia. La visibilidad comercial se administra por separado.</p>')
    s=s.replace('<div class="sheet-tabs"><button class="active" data-sheet="prices">Precios</button><button data-sheet="stock">Stock por producto</button></div>','<div class="sheet-tabs" hidden><button data-sheet="prices">Precios</button><button class="active" data-sheet="stock">Stock</button></div>')
    s=s.replace("window.stockMode='prices';renderMaintenanceGrid();","window.stockMode='stock';renderMaintenanceGrid();")
    s=s.replace("if(vid)r=await sb.from('product_variants').update({stock,published:stock>0,sku}).eq('id',vid);","if(vid)r=await sb.from('product_variants').update({stock,sku}).eq('id',vid);")
    s=s.replace("gridHead.innerHTML='<tr><th>Fragancia</th><th>Familia</th><th>Stock</th><th>SKU completo</th></tr>';","gridHead.innerHTML='<tr><th>Fragancia</th><th>Familia</th><th>Stock actual</th><th>Cantidad</th><th>SKU completo</th></tr>';")
    s=s.replace("'<tr data-na-product=\"'+p.id+'\"><td><b>N/A</b><small class=\"cell-sub\">Sin fragancia</small></td><td>—</td><td><input class=\"cell-stock matrix-stock\" type=\"number\" min=\"0\" value=\"'+stock+'\"></td><td><small>'+ae(p.sku+'-NA')+'</small></td></tr>'","'<tr data-na-product=\"'+p.id+'\"><td><b>N/A</b><small class=\"cell-sub\">Sin fragancia</small></td><td>—</td><td><b>'+stock+'</b></td><td><input class=\"cell-stock matrix-stock\" data-current=\"'+stock+'\" type=\"number\" min=\"0\" placeholder=\"0\"></td><td><small>'+ae(p.sku+'-NA')+'</small></td></tr>'")
    s=s.replace("'<td><input class=\"cell-stock matrix-stock\" type=\"number\" min=\"0\" value=\"'+stock+'\"></td><td><small>'+ae(sku)+'</small></td></tr>'","'<td><b>'+stock+'</b></td><td><input class=\"cell-stock matrix-stock\" data-current=\"'+stock+'\" type=\"number\" min=\"0\" placeholder=\"0\"></td><td><small>'+ae(sku)+'</small></td></tr>'")
    helper="""async function saveStockGridV2(){
 let rows=[...stockBody.querySelectorAll('tr[data-na-product],tr[data-matrix-fragrance]')].filter(tr=>tr.querySelector('.matrix-stock')?.value.trim()!=='');
 if(!rows.length){gridMsg.textContent='Ingresá al menos una cantidad para actualizar.';return}
 if(rows.some(tr=>!Number.isSafeInteger(Number(tr.querySelector('.matrix-stock').value))||Number(tr.querySelector('.matrix-stock').value)<0)){gridMsg.textContent='Las cantidades deben ser números enteros mayores o iguales a 0.';return}
 let mode=await importDialog('<div class=\"import-dialog-kicker\">AJUSTE DE STOCK</div><h3>¿Qué representa la cantidad ingresada?</h3><div class=\"import-mode-grid\"><button class=\"import-mode-card\" data-import-result=\"total\"><b>Stock total</b><span>Reemplaza el inventario actual.</span><small>Ej.: actual 7, ingresás 4 → queda 4.</small></button><button class=\"import-mode-card\" data-import-result=\"incremental\"><b>Ingreso de mercadería</b><span>Suma al inventario actual.</span><small>Ej.: actual 7, ingresás 4 → queda 11.</small></button></div><button class=\"import-cancel\" data-import-result=\"cancel\">Cancelar</button>');
 if(mode==='cancel')return;
 let preview=rows.map(tr=>{let input=tr.querySelector('.matrix-stock'),current=Number(input.dataset.current||0),entered=Number(input.value),target=mode==='incremental'?current+entered:entered;return {tr,current,entered,target}});
 let ok=await importDialog('<div class=\"import-dialog-kicker\">CONFIRMAR STOCK</div><h3>Revisá el ajuste</h3><div class=\"import-preview-list\">'+preview.slice(0,30).map(x=>'<div class=\"import-preview-row\"><b>'+ae(x.tr.querySelector('td:first-child')?.innerText||'Stock')+'</b><span>'+x.current+' → '+x.target+'</span><small>'+(mode==='incremental'?'Ingreso +'+x.entered:'Stock total')+'</small></div>').join('')+'</div><div class=\"import-dialog-actions\"><button class=\"btn secondary\" data-import-result=\"cancel\">Volver</button><button class=\"btn\" data-import-result=\"apply\">Aplicar</button></div>');
 if(ok!=='apply')return;
 saveGrid.disabled=true;gridMsg.textContent='Actualizando stock…';
 try{
  let pid=fltProduct.value,p=adminCache.products.find(x=>x.id===pid);
  for(const x of preview){let tr=x.tr,r;if(tr.dataset.naProduct){r=await sb.from('products').update({stock:x.target}).eq('id',pid)}else{let fid=tr.dataset.matrixFragrance,f=adminCache.fragrances.find(y=>y.id===fid),vid=tr.dataset.variant,sku=p&&p.sku&&f&&f.code?p.sku+'-'+normCode(f.code,2):null;if(vid)r=await sb.from('product_variants').update({stock:x.target,sku}).eq('id',vid);else if(x.target>0)r=await sb.from('product_variants').insert({product_id:pid,fragrance_id:fid,sku,stock:x.target,published:true});if(!r)continue}if(r.error)throw r.error}
  gridMsg.textContent='Stock actualizado.';await adminLoad();renderMaintenanceGrid();
 }catch(e){gridMsg.textContent='No se pudo actualizar el stock: '+(e.message||e)}finally{saveGrid.disabled=false}
}
"""
    if 'async function saveStockGridV2()' not in s:
        s=s.replace('async function saveMaintenanceGrid(){',helper+'async function saveMaintenanceGrid(){',1)
    s=s.replace('saveGrid.onclick=saveMaintenanceGrid;downloadSheet.onclick=downloadMaintenanceWorkbook;','saveGrid.onclick=()=>stockMode===\'stock\'?saveStockGridV2():saveMaintenanceGrid();downloadSheet.onclick=downloadMaintenanceWorkbook;')
    return s


def apply(route, raw):
    s=raw.decode('utf-8') if isinstance(raw,(bytes,bytearray)) else raw
    if route=='/catalog-admin-v2.js': s=patch_catalog(s)
    elif route=='/catalog-admin-v2-utilities.js': s=patch_utilities(s)
    elif route=='/app.js': s=patch_app(s)
    elif route=='/admin': s=patch_admin(s)
    elif route=='/admin-tools.js': s=patch_admin_tools(s)
    return s.encode('utf-8') if isinstance(raw,(bytes,bytearray)) else s