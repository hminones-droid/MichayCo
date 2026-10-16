from pathlib import Path


def replace_once(s, old, new, label):
    n=s.count(old)
    if n != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, found {n}')
    return s.replace(old,new,1)


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
    s=replace_once(s,'function sanitizeCart(){',helpers+'function sanitizeCart(){','app helpers')
    s=replace_once(s,"function productMeta(p){return [p.color,p.capacity_cc!=null?p.capacity_cc+' cc':null].filter(Boolean).join(' · ')}","function productMeta(p){let s=productPrimary(p),a=[];if(s?.capacity_g!=null)a.push(Number(s.capacity_g).toLocaleString('es-AR',{maximumFractionDigits:2})+' g');if(s?.capacity_cc!=null)a.push(Number(s.capacity_cc).toLocaleString('es-AR',{maximumFractionDigits:2})+' cc');let d=physicalDims(s);if(d)a.push(d);return a.join(' · ')}",'app meta')
    s=s.replace("aromaText(p.name)","aromaText(productDisplayName(p))")
    s=s.replace("alt=\"'+p.name+'\"","alt=\"'+productDisplayName(p)+'\"")
    s=s.replace("<h3>${p.name}</h3>","<h3>${productDisplayName(p)}</h3>")
    s=s.replace("$('variantTitle').textContent=p.name;","$('variantTitle').textContent=productDisplayName(p);")
    s=s.replace("<span>${p.name}${productMeta(p)?","<span>${productDisplayName(p)}${productMeta(p)?")
    s=s.replace("aria-label=\"Eliminar ${p.name}\"","aria-label=\"Eliminar ${productDisplayName(p)}\"")
    s=s.replace("'<li>'+p.name+(productMeta(p)?","'<li>'+productDisplayName(p)+(productMeta(p)?")
    return s


def apply(route, raw):
    s=raw.decode('utf-8') if isinstance(raw,(bytes,bytearray)) else raw
    if route=='/catalog-admin-v2.js': s=patch_catalog(s)
    elif route=='/catalog-admin-v2-utilities.js': s=patch_utilities(s)
    elif route=='/app.js': s=patch_app(s)
    return s.encode('utf-8') if isinstance(raw,(bytes,bytearray)) else s
