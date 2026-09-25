
let adminCache={products:[],fragrances:[],variants:[],categories:[],images:[]};
const ae=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const aslug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function adminLoad(){
 let rs=await Promise.all([
  sb.from('products').select('*,category:categories(name)').order('display_order'),
  sb.from('fragrances').select('*').order('display_order'),
  sb.from('product_variants').select('*,product:products(name),fragrance:fragrances(name)').order('display_order'),
  sb.from('categories').select('*').order('display_order'),
  sb.from('product_images').select('*,product:products(name)').order('display_order')
 ]);
 adminCache.products=rs[0].data||[];adminCache.fragrances=rs[1].data||[];adminCache.variants=rs[2].data||[];adminCache.categories=rs[3].data||[];adminCache.images=rs[4].data||[];
}
function adminShell(){return document.getElementById('catalogWorkspace')||document.querySelector('main.admin-main > section.admin-work:not(#passwordPanel)')}
function adminRow(title,sub,meta,fn){
 return '<article class="admin-row"><div><b>'+ae(title)+'</b><span>'+ae(sub)+'</span></div><div class="admin-row-meta"><span>'+ae(meta)+'</span><button data-edit="'+fn+'">Editar</button></div></article>';
}
async function openProducts(){
 await adminLoad();let w=adminShell();w.innerHTML='<div class="admin-toolbar"><div><span class="eyebrow">PRESENTACIONES</span><h2>Productos</h2></div><button class="btn" id="newProduct">+ Nueva</button></div><div id="toolList"></div>';
 toolList.innerHTML=adminCache.products.map(p=>catalogRow(p,'product')).join('');
 newProduct.onclick=()=>productForm();toolList.onclick=async e=>{let edit=e.target.closest('[data-edit]'),vis=e.target.closest('[data-visible]'),del=e.target.closest('[data-trash]');if(edit)return productForm(edit.dataset.edit);if(vis)return toggleCatalogVisibility('products',vis.dataset.visible,vis.checked);if(del)return deleteProduct(del.dataset.trash,del.dataset.name)};
}
function productForm(id){
 let p=adminCache.products.find(x=>x.id===id)||{},w=adminShell();
 w.innerHTML='<button class="back-link" id="toolBack">← Volver</button><span class="eyebrow">PRESENTACIÓN</span><h2>'+(id?'Editar':'Nueva')+' presentación</h2><div class="admin-form"><label>Nombre<input id="afName" value="'+ae(p.name||'')+'"></label><label>Categoría<select id="afCat">'+adminCache.categories.map(c=>'<option value="'+c.id+'" '+(p.category_id===c.id?'selected':'')+'>'+ae(c.name)+'</option>').join('')+'</select></label><label>Descripción breve<textarea id="afShort">'+ae(p.short_description||'')+'</textarea></label><div class="form-grid"><label>Precio base<input id="afPrice" type="number" min="0" value="'+(p.price??'')+'"></label><label>Orden<input id="afOrder" type="number" value="'+(p.display_order??0)+'"></label></div><label class="check"><input id="afPub" type="checkbox" '+(p.published!==false?'checked':'')+'> Publicado</label><button class="btn" id="afSave">Guardar</button><div id="afMsg"></div></div>';
 if(id){let box=document.querySelector('.admin-form');box.insertAdjacentHTML('beforeend','<button class="danger-btn" id="afDelete" type="button">Eliminar producto discontinuado</button>');afDelete.onclick=()=>deleteProduct(id,p.name)} toolBack.onclick=openProducts;afSave.onclick=async()=>{let d={name:afName.value.trim(),slug:aslug(afName.value),category_id:afCat.value,short_description:afShort.value.trim()||null,price:afPrice.value?Number(afPrice.value):null,display_order:Number(afOrder.value||0),published:afPub.checked};let r=id?await sb.from('products').update(d).eq('id',id):await sb.from('products').insert(d);if(r.error)return afMsg.textContent=r.error.message;openProducts()};
}
async function openFragrances(){
 await adminLoad();let w=adminShell();w.innerHTML='<div class="admin-toolbar"><div><span class="eyebrow">AROMAS</span><h2>Fragancias</h2></div><button class="btn" id="newFrag">+ Nueva</button></div><div id="toolList"></div>';
 toolList.innerHTML=adminCache.fragrances.map(f=>catalogRow(f,'fragrance')).join('');
 newFrag.onclick=()=>fragForm();toolList.onclick=async e=>{let edit=e.target.closest('[data-edit]'),vis=e.target.closest('[data-visible]'),del=e.target.closest('[data-trash]');if(edit)return fragForm(edit.dataset.edit);if(vis)return toggleCatalogVisibility('fragrances',vis.dataset.visible,vis.checked);if(del)return deleteFragrance(del.dataset.trash,del.dataset.name)};
}
function fragForm(id){
 let f=adminCache.fragrances.find(x=>x.id===id)||{},w=adminShell();
 w.innerHTML='<button class="back-link" id="toolBack">← Volver</button><span class="eyebrow">FRAGANCIA</span><h2>'+(id?'Editar':'Nueva')+' fragancia</h2><div class="admin-form"><label>Nombre<input id="afName" value="'+ae(f.name||'')+'"></label><label>Descripción breve<textarea id="afShort">'+ae(f.short_description||'')+'</textarea></label><label>Familia olfativa<input id="afFamily" value="'+ae(f.olfactory_family||'')+'"></label><label class="check"><input id="afPub" type="checkbox" '+(f.published!==false?'checked':'')+'> Publicada</label><button class="btn" id="afSave">Guardar</button><div id="afMsg"></div></div>';
 if(id){let box=document.querySelector('.admin-form');box.insertAdjacentHTML('beforeend','<button class="danger-btn" id="afDelete" type="button">Eliminar fragancia discontinuada</button>');afDelete.onclick=()=>deleteFragrance(id,f.name)} toolBack.onclick=openFragrances;afSave.onclick=async()=>{let d={name:afName.value.trim(),slug:aslug(afName.value),short_description:afShort.value.trim()||null,olfactory_family:afFamily.value.trim()||null,published:afPub.checked};let r=id?await sb.from('fragrances').update(d).eq('id',id):await sb.from('fragrances').insert(d);if(r.error)return afMsg.textContent=r.error.message;openFragrances()};
}
async function openVariants(){
 await adminLoad();let w=adminShell();w.innerHTML='<div class="admin-toolbar"><div><span class="eyebrow">EDICIÓN MASIVA</span><h2>Precios y stock</h2><p class="admin-help">Filtrá, pegá valores como en una planilla y guardá todos los cambios juntos.</p></div><div class="toolbar-actions"><button class="btn secondary" id="addMissing">Completar combinaciones</button><button class="btn" id="saveGrid">Guardar cambios</button></div></div><div class="sheet-filters"><label>Producto<select id="fltProduct"><option value="">Todos</option>'+adminCache.products.map(p=>'<option value="'+p.id+'">'+ae(p.name)+'</option>').join('')+'</select></label><label>Fragancia<select id="fltFrag"><option value="">Todas</option>'+adminCache.fragrances.map(f=>'<option value="'+f.id+'">'+ae(f.name)+'</option>').join('')+'</select></label><label>Precio mín.<input id="fltMin" type="number" min="0"></label><label>Precio máx.<input id="fltMax" type="number" min="0"></label><button class="filter-clear" id="clearFilters">Limpiar filtros</button></div><div class="sheet-wrap"><table class="stock-sheet"><thead><tr><th>Producto</th><th>Fragancia</th><th>Precio</th><th>Stock</th><th>Mostrar</th><th></th></tr></thead><tbody id="stockBody"></tbody></table></div><div id="gridMsg" class="grid-msg"></div>';
 renderVariantGrid();
 [fltProduct,fltFrag,fltMin,fltMax].forEach(x=>x.oninput=renderVariantGrid);clearFilters.onclick=()=>{fltProduct.value=fltFrag.value=fltMin.value=fltMax.value='';renderVariantGrid()};saveGrid.onclick=saveVariantGrid;addMissing.onclick=createMissingVariants;
}
function renderVariantGrid(){
 let rows=adminCache.variants.filter(v=>(!fltProduct.value||v.product_id===fltProduct.value)&&(!fltFrag.value||v.fragrance_id===fltFrag.value)&&(!fltMin.value||Number(v.price||0)>=Number(fltMin.value))&&(!fltMax.value||Number(v.price||0)<=Number(fltMax.value)));
 stockBody.innerHTML=rows.map(v=>'<tr data-row="'+v.id+'"><td>'+ae(v.product&&v.product.name||'—')+'</td><td>'+ae(v.fragrance&&v.fragrance.name||'Sin fragancia')+'</td><td><input class="cell-price" type="number" min="0" value="'+(v.price??'')+'" placeholder="Base"></td><td><input class="cell-stock" type="number" min="0" value="'+(v.stock??'')+'"></td><td class="center"><input class="visibility-check" type="checkbox" '+(v.published!==false?'checked':'')+' title="Tildado = visible"></td><td><button class="icon-trash" data-vartrash="'+v.id+'" title="Eliminar combinación" aria-label="Eliminar combinación">⌫</button></td></tr>').join('')||'<tr><td colspan="6" class="sheet-empty">No hay combinaciones con estos filtros.</td></tr>';
 stockBody.onclick=async e=>{let b=e.target.closest('[data-vartrash]');if(!b)return;if(!confirm('¿Eliminar definitivamente esta combinación?'))return;let r=await sb.from('product_variants').delete().eq('id',b.dataset.vartrash);if(r.error)return alert(r.error.message);openVariants()};
}
async function saveVariantGrid(){
 let rows=[...stockBody.querySelectorAll('tr[data-row]')];if(!rows.length)return;
 saveGrid.disabled=true;gridMsg.textContent='Guardando…';
 for(let tr of rows){let d={price:tr.querySelector('.cell-price').value===''?null:Number(tr.querySelector('.cell-price').value),stock:tr.querySelector('.cell-stock').value===''?null:Number(tr.querySelector('.cell-stock').value),published:tr.querySelector('.visibility-check').checked};let r=await sb.from('product_variants').update(d).eq('id',tr.dataset.row);if(r.error){saveGrid.disabled=false;gridMsg.textContent='Error: '+r.error.message;return}}
 saveGrid.disabled=false;gridMsg.textContent='Cambios guardados.';await adminLoad();renderVariantGrid()
}
async function createMissingVariants(){
 if(!confirm('Se crearán las combinaciones que falten entre productos y fragancias publicados. ¿Continuar?'))return;
 let existing=new Set(adminCache.variants.map(v=>v.product_id+'|'+v.fragrance_id)),rows=[];
 adminCache.products.filter(p=>p.published!==false).forEach(p=>adminCache.fragrances.filter(f=>f.published!==false).forEach(f=>{if(!existing.has(p.id+'|'+f.id))rows.push({product_id:p.id,fragrance_id:f.id,price:null,stock:0,published:true})}));
 if(!rows.length)return alert('No faltan combinaciones.');let r=await sb.from('product_variants').insert(rows);if(r.error)return alert(r.error.message);openVariants()
}
function variantForm(id){
 let v=adminCache.variants.find(x=>x.id===id)||{},w=adminShell();
 w.innerHTML='<button class="back-link" id="toolBack">← Volver</button><span class="eyebrow">VARIANTE</span><h2>'+(id?'Editar':'Nueva')+' combinación</h2><div class="admin-form"><label>Presentación<select id="afProduct">'+adminCache.products.map(p=>'<option value="'+p.id+'" '+(v.product_id===p.id?'selected':'')+'>'+ae(p.name)+'</option>').join('')+'</select></label><label>Fragancia<select id="afFrag"><option value="">Sin fragancia</option>'+adminCache.fragrances.map(f=>'<option value="'+f.id+'" '+(v.fragrance_id===f.id?'selected':'')+'>'+ae(f.name)+'</option>').join('')+'</select></label><div class="form-grid"><label>Precio<input id="afPrice" type="number" min="0" value="'+(v.price??'')+'"></label><label>Stock<input id="afStock" type="number" min="0" value="'+(v.stock??'')+'"></label></div><label class="check"><input id="afPub" type="checkbox" '+(v.published!==false?'checked':'')+'> Publicada</label><button class="btn" id="afSave">Guardar</button><div id="afMsg"></div></div>';
 toolBack.onclick=openVariants;afSave.onclick=async()=>{let d={product_id:afProduct.value,fragrance_id:afFrag.value||null,price:afPrice.value?Number(afPrice.value):null,stock:afStock.value===''?null:Number(afStock.value),published:afPub.checked};let r=id?await sb.from('product_variants').update(d).eq('id',id):await sb.from('product_variants').insert(d);if(r.error)return afMsg.textContent=r.error.message;openVariants()};
}
async function openPhotos(){
 await adminLoad();let w=adminShell();w.innerHTML='<span class="eyebrow">FOTOGRAFÍAS</span><h2>Fotos reales</h2><div class="admin-form"><label>Producto<select id="photoProduct">'+adminCache.products.map(p=>'<option value="'+p.id+'">'+ae(p.name)+'</option>').join('')+'</select></label><label>Archivo<input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp"></label><label class="check"><input id="photoPrimary" type="checkbox"> Foto principal</label><button class="btn" id="photoUpload">Subir foto</button><div id="photoMsg"></div></div><div id="photoGrid" class="photo-admin-grid"></div>';renderPhotoGrid();photoUpload.onclick=uploadAdminPhoto;
}
function renderPhotoGrid(){if(!window.photoGrid)return;photoGrid.innerHTML=adminCache.images.map(i=>{let u=sb.storage.from('product-images').getPublicUrl(i.storage_path).data.publicUrl;return '<article><img src="'+u+'"><b>'+ae(i.product&&i.product.name||'Producto')+'</b><span>'+(i.is_primary?'Principal':'Galería')+'</span><div class="photo-actions"><button data-replace="'+i.id+'">Reemplazar</button><button data-primary="'+i.id+'">'+(i.is_primary?'Principal':'Hacer principal')+'</button><button data-del="'+i.id+'" data-path="'+ae(i.storage_path)+'">Eliminar</button></div><input hidden type="file" accept="image/jpeg,image/png,image/webp" data-file="'+i.id+'"></article>'}).join('');photoGrid.onclick=async e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.replace){photoGrid.querySelector('[data-file="'+b.dataset.replace+'"]').click();return}if(b.dataset.primary){await setPrimaryPhoto(b.dataset.primary);return}if(b.dataset.del){if(!confirm('¿Eliminar esta foto?'))return;await sb.storage.from('product-images').remove([b.dataset.path]);let r=await sb.from('product_images').delete().eq('id',b.dataset.del);if(r.error)return alert(r.error.message);openPhotos()}};photoGrid.onchange=async e=>{let input=e.target.closest('[data-file]');if(input&&input.files[0])await replacePhoto(input.dataset.file,input.files[0])}};
async function uploadAdminPhoto(){let file=photoFile.files[0],pid=photoProduct.value;if(!file)return photoMsg.textContent='Elegí una foto.';if(file.size>5*1024*1024)return photoMsg.textContent='Máximo 5 MB.';photoMsg.textContent='Subiendo…';let path=pid+'/'+Date.now()+'-'+file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');let up=await sb.storage.from('product-images').upload(path,file);if(up.error)return photoMsg.textContent=up.error.message;if(photoPrimary.checked)await sb.from('product_images').update({is_primary:false}).eq('product_id',pid);let r=await sb.from('product_images').insert({product_id:pid,storage_path:path,alt_text:'Micha & Co',is_primary:photoPrimary.checked,display_order:0});if(r.error)return photoMsg.textContent=r.error.message;openPhotos()}
async function openOrders(){let w=adminShell(),r=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(100);w.innerHTML='<span class="eyebrow">VENTAS</span><h2>Pedidos</h2><div id="orderTools"></div>';orderTools.innerHTML=(r.data||[]).map(o=>'<article class="admin-row"><div><b>'+ae(o.order_number)+' · '+ae(o.customer_name)+'</b><span>'+new Date(o.created_at).toLocaleString('es-AR')+' · '+ae(o.phone)+'</span></div><div class="admin-row-meta"><span>$ '+Number(o.total).toLocaleString('es-AR')+'</span><select data-order="'+o.id+'">'+['Pendiente de pago','Pago informado','Pago confirmado','En preparación','Listo para entregar','Entregado','Cancelado'].map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div></article>').join('')||'<p>No hay pedidos todavía.</p>';orderTools.onchange=async e=>{if(e.target.dataset.order)await sb.from('orders').update({status:e.target.value}).eq('id',e.target.dataset.order)}}
function showMainWork(){passwordPanel.hidden=true;let k=document.querySelector('.admin-kpis');if(k)k.hidden=true;let w=adminShell();if(w)w.scrollIntoView({behavior:'smooth',block:'start'})} function bindAdminTools(){let buttons=[...document.querySelectorAll('.admin-side nav button')];if(buttons.length<8)return;buttons[0].onclick=()=>location.reload();buttons[1].onclick=()=>{showMainWork();openProducts()};buttons[2].onclick=()=>{showMainWork();openCategories()};buttons[3].onclick=()=>{showMainWork();openFragrances()};buttons[4].onclick=()=>{showMainWork();openVariants()};buttons[5].onclick=()=>{showMainWork();openPhotos()};buttons[6].onclick=()=>{showMainWork();openOrders()};let cards=[...document.querySelectorAll('.admin-actions button')];if(cards[0])cards[0].onclick=()=>{showMainWork();openProducts()};if(cards[1])cards[1].onclick=()=>{showMainWork();openFragrances()};if(cards[2])cards[2].onclick=()=>{showMainWork();openVariants()}}
new MutationObserver(()=>{if(!adminApp.hidden)bindAdminTools()}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden']});
document.addEventListener('DOMContentLoaded',bindAdminTools);

async function deleteProduct(id,name){
 if(!confirm('¿Eliminar definitivamente "'+name+'"?\n\nSi solo querés sacarlo temporalmente de la tienda, cancelá y destildá Publicado.'))return;
 let imgs=adminCache.images.filter(x=>x.product_id===id);
 if(imgs.length){let rr=await sb.storage.from('product-images').remove(imgs.map(x=>x.storage_path));if(rr.error)return alert(rr.error.message)}
 let r=await sb.from('products').delete().eq('id',id);if(r.error)return alert('No se pudo eliminar: '+r.error.message);openProducts()
}
async function deleteFragrance(id,name){
 if(!confirm('¿Eliminar definitivamente la fragancia "'+name+'"?\n\nSi es temporal, cancelá y destildá Publicada.'))return;
 let r=await sb.from('fragrances').delete().eq('id',id);if(r.error)return alert('No se pudo eliminar: '+r.error.message);openFragrances()
}

async function setPrimaryPhoto(id){
 let img=adminCache.images.find(x=>x.id===id);if(!img)return;
 let r=await sb.from('product_images').update({is_primary:false}).eq('product_id',img.product_id);if(r.error)return alert(r.error.message);
 r=await sb.from('product_images').update({is_primary:true}).eq('id',id);if(r.error)return alert(r.error.message);
 openPhotos()
}
async function replacePhoto(id,file){
 if(file.size>5*1024*1024)return alert('La foto supera 5 MB.');
 let img=adminCache.images.find(x=>x.id===id);if(!img)return;
 let ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=img.product_id+'/'+Date.now()+'-reemplazo.'+ext;
 let up=await sb.storage.from('product-images').upload(path,file,{upsert:false});if(up.error)return alert(up.error.message);
 let r=await sb.from('product_images').update({storage_path:path}).eq('id',id);
 if(r.error){await sb.storage.from('product-images').remove([path]);return alert(r.error.message)}
 await sb.storage.from('product-images').remove([img.storage_path]);openPhotos()
}

function catalogRow(x,type){
 let isProduct=type==='product',sub=isProduct?(x.category&&x.category.name||'Sin categoría'):(x.olfactory_family||x.short_description||'Sin familia');
 return '<article class="catalog-row"><button class="catalog-main" data-edit="'+x.id+'" title="Editar"><span><b>'+ae(x.name)+'</b><small>'+ae(sub)+'</small></span></button><div class="catalog-actions"><label class="visibility-control" title="'+(x.published!==false?'Visible en la tienda':'Oculto en la tienda')+'"><input type="checkbox" data-visible="'+x.id+'" '+(x.published!==false?'checked':'')+'><span>Mostrar</span></label><button class="icon-edit" data-edit="'+x.id+'" title="Editar" aria-label="Editar">✎</button><button class="icon-trash" data-trash="'+x.id+'" data-name="'+ae(x.name)+'" title="Eliminar definitivamente" aria-label="Eliminar">⌫</button></div></article>'
}
async function toggleCatalogVisibility(table,id,visible){
 let r=await sb.from(table).update({published:visible}).eq('id',id);if(r.error){alert(r.error.message);visible?event.target.checked=false:event.target.checked=true}
}

async function openCategories(){
 await adminLoad();let w=adminShell();w.innerHTML='<div class="admin-toolbar"><div><span class="eyebrow">CATÁLOGO</span><h2>Categorías</h2><p class="admin-help">Creá, renombrá, ordená u ocultá las familias que verá el cliente.</p></div><button class="btn" id="newCategory">+ Nueva</button></div><div id="categoryList" class="admin-list"></div>';renderCategories();newCategory.onclick=()=>categoryForm()
}
function renderCategories(){
 categoryList.innerHTML=adminCache.categories.map(x=>'<article class="catalog-row"><button class="catalog-main" data-catedit="'+x.id+'"><span><b>'+ae(x.name)+'</b><small>Orden '+(x.display_order??0)+'</small></span></button><div class="catalog-actions"><label class="visibility-control"><input type="checkbox" data-catvisible="'+x.id+'" '+(x.published!==false?'checked':'')+'><span>Mostrar</span></label><button class="icon-edit" data-catedit="'+x.id+'" title="Editar">✎</button><button class="icon-trash" data-cattrash="'+x.id+'" data-name="'+ae(x.name)+'" title="Eliminar">⌫</button></div></article>').join('');
 categoryList.onclick=async e=>{let ed=e.target.closest('[data-catedit]'),v=e.target.closest('[data-catvisible]'),d=e.target.closest('[data-cattrash]');if(ed)return categoryForm(ed.dataset.catedit);if(v){let r=await sb.from('categories').update({published:v.checked}).eq('id',v.dataset.catvisible);if(r.error)alert(r.error.message);return}if(d)return deleteCategory(d.dataset.cattrash,d.dataset.name)}
}
function categoryForm(id){
 let x=adminCache.categories.find(y=>y.id===id)||{};adminShell().innerHTML='<button class="text-link" id="catBack">← Categorías</button><div class="admin-title"><div><span class="eyebrow">CATEGORÍA</span><h2>'+(id?'Editar':'Nueva categoría')+'</h2></div></div><div class="admin-form"><label>Nombre<input id="catName" value="'+ae(x.name||'')+'"></label><label>Orden<input id="catOrder" type="number" value="'+(x.display_order??0)+'"></label><label class="check"><input id="catPub" type="checkbox" '+(x.published!==false?'checked':'')+'> Mostrar en la tienda</label><button class="btn" id="catSave">Guardar</button><div id="catMsg"></div></div>';
 catBack.onclick=openCategories;catSave.onclick=async()=>{let name=catName.value.trim();if(!name)return catMsg.textContent='Ingresá un nombre.';let d={name,slug:aslug(name),display_order:Number(catOrder.value||0),published:catPub.checked};let r=id?await sb.from('categories').update(d).eq('id',id):await sb.from('categories').insert(d);if(r.error)return catMsg.textContent=r.error.message;openCategories()}
}
async function deleteCategory(id,name){
 if(adminCache.products.some(p=>p.category_id===id))return alert('Esta categoría tiene productos asociados. Primero movelos a otra categoría; después podrás eliminarla.');
 if(!confirm('¿Eliminar definitivamente la categoría "'+name+'"?'))return;let r=await sb.from('categories').delete().eq('id',id);if(r.error)return alert(r.error.message);openCategories()
}
