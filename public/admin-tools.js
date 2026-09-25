
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
function adminShell(){
 let w=document.querySelector('.admin-work');if(!w)return null;return w;
}
function adminRow(title,sub,meta,fn){
 return '<article class="admin-row"><div><b>'+ae(title)+'</b><span>'+ae(sub)+'</span></div><div class="admin-row-meta"><span>'+ae(meta)+'</span><button data-edit="'+fn+'">Editar</button></div></article>';
}
async function openProducts(){
 await adminLoad();let w=adminShell();w.innerHTML='<div class="admin-toolbar"><div><span class="eyebrow">PRESENTACIONES</span><h2>Productos</h2></div><button class="btn" id="newProduct">+ Nueva</button></div><div id="toolList"></div>';
 toolList.innerHTML=adminCache.products.map(p=>adminRow(p.name,p.category&&p.category.name||'Sin categoría',p.price==null?'Precio a confirmar':'$ '+Number(p.price).toLocaleString('es-AR'),'p:'+p.id)).join('');
 newProduct.onclick=()=>productForm();toolList.onclick=e=>{let b=e.target.closest('[data-edit]');if(b)productForm(b.dataset.edit.slice(2))};
}
function productForm(id){
 let p=adminCache.products.find(x=>x.id===id)||{},w=adminShell();
 w.innerHTML='<button class="back-link" id="toolBack">← Volver</button><span class="eyebrow">PRESENTACIÓN</span><h2>'+(id?'Editar':'Nueva')+' presentación</h2><div class="admin-form"><label>Nombre<input id="afName" value="'+ae(p.name||'')+'"></label><label>Categoría<select id="afCat">'+adminCache.categories.map(c=>'<option value="'+c.id+'" '+(p.category_id===c.id?'selected':'')+'>'+ae(c.name)+'</option>').join('')+'</select></label><label>Descripción breve<textarea id="afShort">'+ae(p.short_description||'')+'</textarea></label><div class="form-grid"><label>Precio base<input id="afPrice" type="number" min="0" value="'+(p.price??'')+'"></label><label>Orden<input id="afOrder" type="number" value="'+(p.display_order??0)+'"></label></div><label class="check"><input id="afPub" type="checkbox" '+(p.published!==false?'checked':'')+'> Publicado</label><button class="btn" id="afSave">Guardar</button><div id="afMsg"></div></div>';
 toolBack.onclick=openProducts;afSave.onclick=async()=>{let d={name:afName.value.trim(),slug:aslug(afName.value),category_id:afCat.value,short_description:afShort.value.trim()||null,price:afPrice.value?Number(afPrice.value):null,display_order:Number(afOrder.value||0),published:afPub.checked};let r=id?await sb.from('products').update(d).eq('id',id):await sb.from('products').insert(d);if(r.error)return afMsg.textContent=r.error.message;openProducts()};
}
async function openFragrances(){
 await adminLoad();let w=adminShell();w.innerHTML='<div class="admin-toolbar"><div><span class="eyebrow">AROMAS</span><h2>Fragancias</h2></div><button class="btn" id="newFrag">+ Nueva</button></div><div id="toolList"></div>';
 toolList.innerHTML=adminCache.fragrances.map(f=>adminRow(f.name,f.olfactory_family||'Sin familia',f.short_description||'', 'f:'+f.id)).join('');
 newFrag.onclick=()=>fragForm();toolList.onclick=e=>{let b=e.target.closest('[data-edit]');if(b)fragForm(b.dataset.edit.slice(2))};
}
function fragForm(id){
 let f=adminCache.fragrances.find(x=>x.id===id)||{},w=adminShell();
 w.innerHTML='<button class="back-link" id="toolBack">← Volver</button><span class="eyebrow">FRAGANCIA</span><h2>'+(id?'Editar':'Nueva')+' fragancia</h2><div class="admin-form"><label>Nombre<input id="afName" value="'+ae(f.name||'')+'"></label><label>Descripción breve<textarea id="afShort">'+ae(f.short_description||'')+'</textarea></label><label>Familia olfativa<input id="afFamily" value="'+ae(f.olfactory_family||'')+'"></label><label class="check"><input id="afPub" type="checkbox" '+(f.published!==false?'checked':'')+'> Publicada</label><button class="btn" id="afSave">Guardar</button><div id="afMsg"></div></div>';
 toolBack.onclick=openFragrances;afSave.onclick=async()=>{let d={name:afName.value.trim(),slug:aslug(afName.value),short_description:afShort.value.trim()||null,olfactory_family:afFamily.value.trim()||null,published:afPub.checked};let r=id?await sb.from('fragrances').update(d).eq('id',id):await sb.from('fragrances').insert(d);if(r.error)return afMsg.textContent=r.error.message;openFragrances()};
}
async function openVariants(){
 await adminLoad();let w=adminShell();w.innerHTML='<div class="admin-toolbar"><div><span class="eyebrow">COMBINACIONES</span><h2>Stock y precios</h2></div><button class="btn" id="newVar">+ Nueva</button></div><div id="toolList"></div>';
 toolList.innerHTML=adminCache.variants.map(v=>adminRow((v.product&&v.product.name||'Producto')+' · '+(v.fragrance&&v.fragrance.name||'Sin fragancia'),'Stock: '+(v.stock??'—'),v.price==null?'Precio base':'$ '+Number(v.price).toLocaleString('es-AR'),'v:'+v.id)).join('');
 newVar.onclick=()=>variantForm();toolList.onclick=e=>{let b=e.target.closest('[data-edit]');if(b)variantForm(b.dataset.edit.slice(2))};
}
function variantForm(id){
 let v=adminCache.variants.find(x=>x.id===id)||{},w=adminShell();
 w.innerHTML='<button class="back-link" id="toolBack">← Volver</button><span class="eyebrow">VARIANTE</span><h2>'+(id?'Editar':'Nueva')+' combinación</h2><div class="admin-form"><label>Presentación<select id="afProduct">'+adminCache.products.map(p=>'<option value="'+p.id+'" '+(v.product_id===p.id?'selected':'')+'>'+ae(p.name)+'</option>').join('')+'</select></label><label>Fragancia<select id="afFrag"><option value="">Sin fragancia</option>'+adminCache.fragrances.map(f=>'<option value="'+f.id+'" '+(v.fragrance_id===f.id?'selected':'')+'>'+ae(f.name)+'</option>').join('')+'</select></label><div class="form-grid"><label>Precio<input id="afPrice" type="number" min="0" value="'+(v.price??'')+'"></label><label>Stock<input id="afStock" type="number" min="0" value="'+(v.stock??'')+'"></label></div><label class="check"><input id="afPub" type="checkbox" '+(v.published!==false?'checked':'')+'> Publicada</label><button class="btn" id="afSave">Guardar</button><div id="afMsg"></div></div>';
 toolBack.onclick=openVariants;afSave.onclick=async()=>{let d={product_id:afProduct.value,fragrance_id:afFrag.value||null,price:afPrice.value?Number(afPrice.value):null,stock:afStock.value===''?null:Number(afStock.value),published:afPub.checked};let r=id?await sb.from('product_variants').update(d).eq('id',id):await sb.from('product_variants').insert(d);if(r.error)return afMsg.textContent=r.error.message;openVariants()};
}
async function openPhotos(){
 await adminLoad();let w=adminShell();w.innerHTML='<span class="eyebrow">FOTOGRAFÍAS</span><h2>Fotos reales</h2><div class="admin-form"><label>Producto<select id="photoProduct">'+adminCache.products.map(p=>'<option value="'+p.id+'">'+ae(p.name)+'</option>').join('')+'</select></label><label>Archivo<input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp"></label><label class="check"><input id="photoPrimary" type="checkbox"> Foto principal</label><button class="btn" id="photoUpload">Subir foto</button><div id="photoMsg"></div></div><div id="photoGrid" class="photo-admin-grid"></div>';renderPhotoGrid();photoUpload.onclick=uploadAdminPhoto;
}
function renderPhotoGrid(){if(!window.photoGrid)return;photoGrid.innerHTML=adminCache.images.map(i=>{let u=sb.storage.from('product-images').getPublicUrl(i.storage_path).data.publicUrl;return '<article><img src="'+u+'"><b>'+ae(i.product&&i.product.name||'Producto')+'</b><span>'+(i.is_primary?'Principal':'Galería')+'</span><button data-del="'+i.id+'" data-path="'+ae(i.storage_path)+'">Eliminar</button></article>'}).join('');photoGrid.onclick=async e=>{let b=e.target.closest('[data-del]');if(!b)return;if(!confirm('¿Eliminar esta foto?'))return;await sb.storage.from('product-images').remove([b.dataset.path]);await sb.from('product_images').delete().eq('id',b.dataset.del);openPhotos()}};
async function uploadAdminPhoto(){let file=photoFile.files[0],pid=photoProduct.value;if(!file)return photoMsg.textContent='Elegí una foto.';if(file.size>5*1024*1024)return photoMsg.textContent='Máximo 5 MB.';photoMsg.textContent='Subiendo…';let path=pid+'/'+Date.now()+'-'+file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');let up=await sb.storage.from('product-images').upload(path,file);if(up.error)return photoMsg.textContent=up.error.message;if(photoPrimary.checked)await sb.from('product_images').update({is_primary:false}).eq('product_id',pid);let r=await sb.from('product_images').insert({product_id:pid,storage_path:path,alt_text:'Micha & Co',is_primary:photoPrimary.checked,display_order:0});if(r.error)return photoMsg.textContent=r.error.message;openPhotos()}
async function openOrders(){let w=adminShell(),r=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(100);w.innerHTML='<span class="eyebrow">VENTAS</span><h2>Pedidos</h2><div id="orderTools"></div>';orderTools.innerHTML=(r.data||[]).map(o=>'<article class="admin-row"><div><b>'+ae(o.order_number)+' · '+ae(o.customer_name)+'</b><span>'+new Date(o.created_at).toLocaleString('es-AR')+' · '+ae(o.phone)+'</span></div><div class="admin-row-meta"><span>$ '+Number(o.total).toLocaleString('es-AR')+'</span><select data-order="'+o.id+'">'+['Pendiente de pago','Pago informado','Pago confirmado','En preparación','Listo para entregar','Entregado','Cancelado'].map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div></article>').join('')||'<p>No hay pedidos todavía.</p>';orderTools.onchange=async e=>{if(e.target.dataset.order)await sb.from('orders').update({status:e.target.value}).eq('id',e.target.dataset.order)}}
function bindAdminTools(){let buttons=[...document.querySelectorAll('.admin-side nav button')];if(buttons.length<7)return;buttons[1].onclick=openProducts;buttons[2].onclick=openFragrances;buttons[3].onclick=openVariants;buttons[4].onclick=openPhotos;buttons[5].onclick=openOrders;let cards=[...document.querySelectorAll('.admin-actions button')];if(cards[0])cards[0].onclick=openProducts;if(cards[1])cards[1].onclick=openFragrances;if(cards[2])cards[2].onclick=openVariants}
new MutationObserver(()=>{if(!adminApp.hidden)bindAdminTools()}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden']});
document.addEventListener('DOMContentLoaded',bindAdminTools);
