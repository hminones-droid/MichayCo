/* Move existing controls, retaining values, handlers and catalogue shortcuts. */
const CatalogLayout=(()=>{
 function group(form,title,ids,open=true){
  const box=document.createElement('details');box.className='catalog-topic';box.open=open;
  const heading=document.createElement('summary');heading.textContent=title;box.appendChild(heading);
  const grid=document.createElement('div');grid.className='catalog-topic-grid';box.appendChild(grid);
  for(const id of ids){const field=form.querySelector('#'+id);if(field)grid.appendChild(field.closest('label')||field);}
  form.appendChild(box);return box;
 }
 function arrange(kind){
  const form=document.querySelector('.admin-form');if(!form||form.dataset.arranged)return;
  form.dataset.arranged=kind;form.classList.add('catalog-organized');
  const old=[...form.children],guide=form.querySelector('.catalog-guide');
  if(guide){guide.textContent=kind==='product'?'Completá el envase, revisá su contenido y agregá fotos. Los cálculos de fabricación son internos.':kind==='fragrance'?'Definí cómo se presenta el aroma y, debajo, qué esencias lo componen.':'Identificá la categoría y definí sus valores sugeridos de fabricación.';}
  let physical;
  if(kind==='product'){
   group(form,'Identidad del producto',['afName','afCat']);
   physical=group(form,'Aspecto físico y envase',['afMaterial','afColor','afCapacity','afLid']);
   const slot=document.createElement('div');slot.dataset.physicalMeasures='';physical.appendChild(slot);
   const content=group(form,'Contenido y fabricación',['afUsesFragrance']);content.dataset.contentSlot='';
   const photos=group(form,'Fotografías',[],false);const gallery=form.querySelector('.product-photo-inline');if(gallery)photos.appendChild(gallery);
   group(form,'Venta y presentación en la tienda',['afShort','afPrice','afPub']);
  }else if(kind==='fragrance'){
   group(form,'Identidad y descripción',['afName','afFamily','afShort','afPub']);
  }else group(form,'Identidad y visualización',['catName','catCode','catOrder','catPub']);
  for(const el of old){
   if(!el.isConnected||el.parentElement!==form||el===guide)continue;
   if(el.matches('.form-grid')&&!el.children.length)el.remove();
   else if(el.matches('p.admin-help'))el.remove();
  }
  const advanced=form.querySelector('.catalog-advanced');if(advanced)form.appendChild(advanced);
  const actions=document.createElement('div');actions.className='catalog-main-actions';
  for(const el of [...form.children])if(el.matches('button,#afMsg,#catMsg'))actions.appendChild(el);
  form.appendChild(actions);
 }
 return {arrange};
})();
