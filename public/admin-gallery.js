let photoGalleryProductId=null;
const articlePhotoSelection=new Map();
function articlePhotos(id){return adminCache.images.filter(i=>i.product_id===id).sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||Number(a.display_order||0)-Number(b.display_order||0))}
function mountArticlePhotos(host,id){
 const p=adminCache.products.find(p=>p.id===id);if(!p)return;
 const photos=articlePhotos(id);let index=Math.max(0,photos.findIndex(i=>i.id===articlePhotoSelection.get(id))),photo=photos[index];
 if(photo)articlePhotoSelection.set(id,photo.id);
 host.classList.add('article-photo-module');
 const url=i=>sb.storage.from('product-images').getPublicUrl(i.storage_path).data.publicUrl;
 host.innerHTML='<header><b>'+ae(p.name)+'</b><small>'+ae(p.color||'Sin color')+(p.capacity_cc!=null?' · '+p.capacity_cc+' cc':'')+'</small><code>'+ae(p.sku||'SKU pendiente')+'</code></header><button type="button" class="article-photo-stage" data-action="zoom" '+(!photo?'disabled':'')+' aria-label="Ampliar foto de '+ae(p.name)+'">'+(photo?'<img src="'+ae(url(photo))+'" alt="'+ae(p.name+' · '+(p.color||''))+'"><span>Ampliar</span>':'<span>Este artículo todavía no tiene fotos</span>')+'</button><div class="article-photo-nav"><button type="button" data-action="prev" aria-label="Foto anterior" '+(photos.length<2?'disabled':'')+'>←</button><span aria-live="polite">'+(photo?(index+1)+' de '+photos.length+' · '+(photo.is_primary?'Principal':'Galería'):'Sin fotos')+'</span><button type="button" data-action="next" aria-label="Foto siguiente" '+(photos.length<2?'disabled':'')+'>→</button></div><div class="article-photo-actions"><button type="button" data-action="add">+ Agregar fotos</button>'+(photo?'<button type="button" data-action="frame">Encuadrar</button><button type="button" data-action="replace">Reemplazar</button><button type="button" data-action="primary" '+(photo.is_primary?'disabled':'')+'>Hacer principal</button><button type="button" data-action="delete">Eliminar esta foto</button>':'')+'</div><input hidden type="file" data-files="add" multiple accept="image/jpeg,image/png,image/webp"><input hidden type="file" data-files="replace" accept="image/jpeg,image/png,image/webp"><p class="article-photo-message" role="status"></p>';
 const status=host.querySelector('[role="status"]');
 let busy=false;
 const run=async fn=>{if(busy)return;busy=true;host.querySelectorAll('button,input').forEach(x=>x.disabled=true);status.textContent='Guardando fotos…';try{await fn();await adminLoad();mountArticlePhotos(host,id);host.querySelector('[role="status"]').textContent='Fotos actualizadas.'}catch(e){mountArticlePhotos(host,id);host.querySelector('[role="status"]').textContent='No se pudo completar: '+(e.message||e)}};
 host.onclick=async e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;if(!action||busy)return;
  if(action==='prev'||action==='next'){articlePhotoSelection.set(id,photos[(index+(action==='next'?1:-1)+photos.length)%photos.length].id);mountArticlePhotos(host,id)}
  if(action==='add'||action==='replace')host.querySelector('[data-files="'+action+'"]').click();
  if(action==='zoom'){
   const dialog=document.createElement('dialog');dialog.className='article-photo-zoom';dialog.setAttribute('aria-label','Foto ampliada de '+p.name);
   const image=document.createElement('img');image.src=url(photo);image.alt=p.name+' · '+(p.color||'');
   const close=document.createElement('button');close.type='button';close.textContent='Cerrar ×';close.onclick=()=>dialog.close();
   dialog.append(close,image);dialog.onclose=()=>dialog.remove();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};document.body.append(dialog);dialog.showModal();
  }
  if(action==='frame')openPhotoFraming(photo.id,()=>mountArticlePhotos(host,id));
  if(action==='primary')run(async()=>{let r=await sb.from('product_images').update({is_primary:false}).eq('product_id',id);if(r.error)throw r.error;r=await sb.from('product_images').update({is_primary:true}).eq('id',photo.id);if(r.error)throw r.error});
  if(action==='delete'&&confirm('¿Eliminar esta foto? Las otras fotos del artículo se conservan.'))run(async()=>{let r=await sb.from('product_images').delete().eq('id',photo.id);if(r.error)throw r.error;const remaining=photos.filter(i=>i.id!==photo.id);if(photo.is_primary&&remaining.length){r=await sb.from('product_images').update({is_primary:true}).eq('id',remaining[0].id);if(r.error)throw r.error}await sb.storage.from('product-images').remove([photo.storage_path])});
 };
 host.onchange=e=>{const input=e.target.closest('[data-files]');if(!input)return;const files=[...input.files];if(!files.length)return;if(files.some(f=>f.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type))){status.textContent='Elegí JPG, PNG o WebP de hasta 5 MB por foto.';input.value='';return}run(async()=>{if(input.dataset.files==='replace')await replacePhotoInline(photo,files[0]);else for(const file of files){await uploadPhotoForProduct(id,file,p.color_code);await adminLoad()}})};
}
