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
    alert('Producto duplicado con '+links.length+' componente(s). Revisá la composición y cambiá sólo el envase o insumo que corresponda. Stock, fotos y publicación quedaron en cero/oculto.');
    if(typeof window.openProductSupplies==='function')return window.openProductSupplies(newId);
    if(typeof window.v2ProductForm==='function')return window.v2ProductForm(newId);
    if(typeof window.productForm==='function')return window.productForm(newId);
    if(typeof window.openProducts==='function')return window.openProducts();
  }
  window.duplicateProductCanonical=duplicateProductCanonical;

  function closeReplacementDialog(){document.getElementById('productSupplyReplaceOverlay')?.remove()}
  async function replaceProductSupply(linkId){
    const lr=await sb.from('product_supplies').select('id,product_id,supply_id,role,content_container_supply_id,supply:supplies!product_supplies_supply_id_fkey(id,code,purchase_name,type)').eq('id',linkId).single();
    if(lr.error||!lr.data)return alert('No se pudo leer el componente: '+(lr.error?.message||'registro inexistente'));
    const link=lr.data,current=link.supply;
    const sr=await sb.from('supplies').select('id,code,purchase_name,type,color,material,capacity_g,capacity_cc,height_mm,width_mm,depth_mm').eq('active',true).eq('type',current?.type||'container').order('purchase_name');
    if(sr.error)return alert('No se pudieron cargar alternativas: '+sr.error.message);
    const options=sr.data||[];
    const overlay=document.createElement('div');overlay.id='productSupplyReplaceOverlay';overlay.style.cssText='position:fixed;inset:0;background:rgba(25,25,20,.42);z-index:99999;display:grid;place-items:center;padding:20px';
    const box=document.createElement('div');box.style.cssText='width:min(620px,94vw);background:#fffdf8;border:1px solid #d7cebf;border-radius:10px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.22)';
    box.innerHTML='<span class="eyebrow">CAMBIAR COMPONENTE</span><h3 style="margin:8px 0 6px">'+(link.role==='primary'?'Cambiar componente principal':'Cambiar insumo')+'</h3><p class="admin-help" style="margin-bottom:14px">Se conserva el rol, la regla de cantidad y el resto de la composición. Sólo se reemplaza este insumo.</p><label>Nuevo insumo<select id="replaceSupplySelect" style="width:100%;margin-top:6px"><option value="">Seleccionar…</option>'+options.map(x=>'<option value="'+x.id+'" '+(x.id===link.supply_id?'selected':'')+'>'+ae(x.code+' · '+x.purchase_name+(x.color?' · '+x.color:''))+'</option>').join('')+'</select></label><div id="replaceSupplyMsg" class="admin-help" style="min-height:24px;margin-top:8px"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn secondary" id="replaceSupplyCancel">Cancelar</button><button type="button" class="btn" id="replaceSupplySave">Guardar cambio</button></div>';
    overlay.appendChild(box);document.body.appendChild(overlay);
    const select=box.querySelector('#replaceSupplySelect'),msg=box.querySelector('#replaceSupplyMsg'),save=box.querySelector('#replaceSupplySave');
    box.querySelector('#replaceSupplyCancel').onclick=closeReplacementDialog;overlay.onclick=e=>{if(e.target===overlay)closeReplacementDialog()};
    save.onclick=async()=>{
      const next=select.value;if(!next)return msg.textContent='Seleccioná un insumo.';
      if(next===link.supply_id){closeReplacementDialog();return}
      save.disabled=true;msg.textContent='Guardando…';
      const dup=await sb.from('product_supplies').select('id',{count:'exact',head:true}).eq('product_id',link.product_id).eq('supply_id',next).neq('id',link.id);
      if(dup.error){save.disabled=false;return msg.textContent=dup.error.message}
      if((dup.count||0)>0){save.disabled=false;return msg.textContent='Ese insumo ya forma parte del producto. Elegí otro.'}
      const ur=await sb.from('product_supplies').update({supply_id:next}).eq('id',link.id);
      if(ur.error){save.disabled=false;return msg.textContent=ur.error.message}
      if(link.role==='primary'){
        const refs=await sb.from('product_supplies').update({content_container_supply_id:next}).eq('product_id',link.product_id).eq('content_container_supply_id',link.supply_id);
        if(refs.error){save.disabled=false;return msg.textContent='Se cambió el principal, pero no se pudo actualizar una referencia interna: '+refs.error.message}
      }
      closeReplacementDialog();await adminLoad();if(typeof openProductSupplies==='function')openProductSupplies(link.product_id);
    };
  }

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

  function decorateComponentRows(){
    const root=typeof adminShell==='function'?adminShell():document;
    if(!root?.querySelector('#psAdd'))return;
    root.querySelectorAll('[data-remove]').forEach(remove=>{
      const id=remove.dataset.remove;if(!id||root.querySelector('[data-replace-supply="'+id+'"]'))return;
      const b=document.createElement('button');b.type='button';b.className='text-link';b.dataset.replaceSupply=id;b.textContent='Cambiar';b.title='Reemplazar este insumo conservando su función y regla';
      remove.insertAdjacentElement('beforebegin',b);
    });
  }

  document.addEventListener('click',e=>{
    const repl=e.target.closest?.('[data-replace-supply]');
    if(repl){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();replaceProductSupply(repl.dataset.replaceSupply).catch(err=>alert('No se pudo cambiar el insumo: '+(err?.message||err)));return}
    const v2=e.target.closest?.('[data-product-duplicate]');
    if(v2){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();duplicateProductCanonical(v2.dataset.productDuplicate).catch(err=>alert('No se pudo duplicar el producto: '+(err?.message||err)));return}
    const legacy=e.target.closest?.('[data-clone]');
    if(legacy){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();duplicateProductCanonical(legacy.dataset.clone).catch(err=>alert('No se pudo duplicar el producto: '+(err?.message||err)));}
  },true);

  new MutationObserver(()=>queueMicrotask(()=>{decorateV2Products();decorateComponentRows()})).observe(document.documentElement,{childList:true,subtree:true});
  queueMicrotask(()=>{decorateV2Products();decorateComponentRows()});
})();
