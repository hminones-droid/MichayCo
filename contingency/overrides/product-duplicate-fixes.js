/* Micha & Co — canonical product duplication: copy configuration, never inventory/photos. */
(function(){
  const uuidSku=()=>{const t=crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase();return 'V2-'+t.slice(0,6)+'-'+t.slice(6,12)+'-00-00-01'};

  async function readProduct(id){
    const [pr,lr]=await Promise.all([
      sb.from('products').select('*').eq('id',id).single(),
      sb.from('product_supplies').select('supply_id,role,quantity,quantity_rule,content_container_supply_id,notes,display_order').eq('product_id',id).order('display_order')
    ]);
    if(pr.error||!pr.data)throw new Error(pr.error?.message||'Producto inexistente');
    if(lr.error)throw new Error(lr.error.message);
    return {product:pr.data,links:lr.data||[]};
  }

  function copyData(p,name){
    return {
      sku:uuidSku(),
      name,
      slug:(typeof aslug==='function'?aslug(name):String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))+'-'+crypto.randomUUID().slice(0,8),
      category_id:p.category_id||null,
      short_description:p.short_description||null,
      description:p.description||null,
      scent:p.scent||null,
      presentation:p.presentation||null,
      price:p.price==null?null:Number(p.price),
      stock:0,
      published:false,
      featured:false,
      display_order:p.display_order??0,
      uses_fragrance:p.uses_fragrance!==false,
      fragrance_policy:p.uses_fragrance===false?'none':(p.fragrance_policy||'all_active')
    };
  }

  async function duplicateProductCanonical(id){
    const {product:p,links}=await readProduct(id);
    const suggested=(String(p.name||'').trim()+' copia').trim();
    const entered=prompt('Nombre base del producto duplicado:',suggested);
    if(entered===null)return;
    const name=entered.trim();if(!name)return alert('Ingresá un nombre para el producto duplicado.');
    const ins=await sb.from('products').insert(copyData(p,name)).select('id').single();
    if(ins.error)throw new Error(ins.error.message);
    const newId=ins.data.id;
    if(links.length){
      const rows=links.map((x,i)=>({
        product_id:newId,
        supply_id:x.supply_id,
        role:x.role,
        quantity:x.quantity,
        quantity_rule:x.quantity_rule,
        content_container_supply_id:x.content_container_supply_id||null,
        notes:x.notes||null,
        display_order:x.display_order??i
      }));
      const lr=await sb.from('product_supplies').insert(rows);
      if(lr.error){
        await sb.from('products').delete().eq('id',newId);
        throw new Error('No se pudieron copiar los componentes: '+lr.error.message);
      }
    }
    await adminLoad();
    alert('Producto duplicado con '+links.length+' componente(s). Se copió la composición completa; stock, fotos y publicación quedaron en cero/oculto para revisión.');
    if(typeof window.v2ProductForm==='function')return window.v2ProductForm(newId);
    if(typeof window.productForm==='function')return window.productForm(newId);
    if(typeof window.openProducts==='function')return window.openProducts();
  }
  window.duplicateProductCanonical=duplicateProductCanonical;

  function decorateV2Products(){
    const root=typeof adminShell==='function'?adminShell():document;
    root?.querySelectorAll('.catalog-v2-row').forEach(row=>{
      const src=row.querySelector('[data-v2product]');
      if(!src)return;
      const id=src.dataset.v2product;
      if(!id||row.querySelector('[data-product-duplicate="'+id+'"]'))return;
      const edit=[...row.querySelectorAll('button')].find(b=>b.dataset.v2product===id&&b!==src)||row.querySelector('.icon-edit');
      if(!edit)return;
      const b=document.createElement('button');b.type='button';b.className='icon-edit';b.dataset.productDuplicate=id;b.title='Duplicar producto con todos sus componentes';b.setAttribute('aria-label','Duplicar producto');b.textContent='⧉';
      edit.insertAdjacentElement('afterend',b);
    });
  }

  document.addEventListener('click',e=>{
    const v2=e.target.closest?.('[data-product-duplicate]');
    if(v2){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();duplicateProductCanonical(v2.dataset.productDuplicate).catch(err=>alert('No se pudo duplicar el producto: '+(err?.message||err)));return}
    const legacy=e.target.closest?.('[data-clone]');
    if(legacy){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();duplicateProductCanonical(legacy.dataset.clone).catch(err=>alert('No se pudo duplicar el producto: '+(err?.message||err)));}
  },true);

  new MutationObserver(()=>queueMicrotask(decorateV2Products)).observe(document.documentElement,{childList:true,subtree:true});
  queueMicrotask(decorateV2Products);
})();
