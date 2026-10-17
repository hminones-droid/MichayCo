/* Micha & Co — V2 compatibility fixes. Remove after legacy admin is retired. */
(function(){
  let usageByProduct={},suppliesById={};
  const v2OpenCategories=window.openCategories;
  const v2SupplyForm=window.supplyForm;

  function linkManufacturingCapacity(link){
    const supply=suppliesById[link.supply_id];
    if(!supply)return 0;
    const stock=Number(supply.stock||0);
    if(stock<=0)return 0;
    const qty=Number(link.quantity);
    if(['fixed','per_unit'].includes(link.quantity_rule)&&Number.isFinite(qty)&&qty>0)return Math.floor(stock/qty);
    return null;
  }

  function v2Readiness(p){
    const missing=[],warnings=[];
    if(!p?.name)missing.push('nombre');
    if(!p?.category_id)missing.push('categoría');
    if(p?.price==null)missing.push('precio');
    if(typeof articlePhotos==='function'&&!articlePhotos(p.id)[0])missing.push('foto');
    const links=usageByProduct[p.id]||[];
    if(!links.length)missing.push('componentes');
    const capacities=links.map(linkManufacturingCapacity);
    const hasMissingSupply=links.some(x=>!suppliesById[x.supply_id]);
    const known=capacities.filter(x=>x!==null);
    const manufacturingCapacity=links.length&&!hasMissingSupply&&known.length===capacities.length?Math.min(...known):null;
    if(p?.published!==false&&manufacturingCapacity===0)warnings.push('sin capacidad de fabricación con el stock actual de insumos');
    if(p?.published!==false&&manufacturingCapacity===null&&links.length)warnings.push('capacidad de fabricación pendiente de resolver por receta/capacidad');
    if(p?.published!==false&&missing.length)warnings.push('visible incompleto');
    return {missing,warnings,manufacturingCapacity,stock:manufacturingCapacity,state:missing.length?'incomplete':'complete',label:missing.length?'Falta '+missing.join(' · '):'Configuración completa',salesReady:!missing.length&&p?.published!==false};
  }

  async function loadV2ReadinessContext(){
    const [linksR,suppliesR]=await Promise.all([
      sb.from('product_supplies').select('product_id,supply_id,quantity,quantity_rule,role,content_container_supply_id'),
      sb.from('supplies').select('id,stock,stock_unit,capacity_cc')
    ]);
    usageByProduct=(linksR.data||[]).reduce((m,x)=>{(m[x.product_id]||(m[x.product_id]=[])).push(x);return m},{});
    suppliesById=(suppliesR.data||[]).reduce((m,x)=>(m[x.id]=x,m),{});
    window.productReadiness=v2Readiness;
  }

  window.openCategories=async function(){await loadV2ReadinessContext();return v2OpenCategories()};

  window.supplyForm=async function(id){
    await v2SupplyForm(id);
    const capacity=document.getElementById('supCapacity');
    if(capacity){
      const label=capacity.closest('label');
      if(label)label.childNodes[0].textContent='Capacidad líquida (cc) ';
      capacity.placeholder='Sólo difusores / sprays';
      if(label&&!label.querySelector('[data-v2-capacity-note]')){
        const note=document.createElement('small');note.dataset.v2CapacityNote='1';note.className='admin-help';
        note.textContent='Para velas no se carga capacidad en cc: el producto terminado usa peso neto en gramos.';label.appendChild(note);
      }
    }
  };

  function activeCatalog(){return document.querySelector('[data-admin-nav].active')?.dataset.adminNav||''}
  function ensureCanonicalHeader(){
    const root=typeof adminShell==='function'?adminShell():null;if(!root)return;
    const active=activeCatalog(),list=root.querySelector('.catalog-v2-list');if(!list)return;
    if(active==='supplies'){
      const head=root.querySelector('.supply-v2-head');
      if(head&&!head.querySelector('[data-v2-supply-actions-head]')){
        const span=document.createElement('span');span.dataset.v2SupplyActionsHead='1';span.textContent='Acciones';head.appendChild(span);
      }
      return;
    }
    if(root.querySelector('.catalog-v2-head'))return;
    let labels=null;
    if(active==='products')labels=['Producto','Precio','Stock','Visible','Completitud','Acciones'];
    if(active==='fragrances')labels=['Fragancia','Composición','Completitud','Acciones'];
    if(!labels)return;
    const head=document.createElement('div');head.className='catalog-v2-head product-supply-head';head.setAttribute('aria-hidden','true');
    head.innerHTML=labels.map(x=>'<span>'+x+'</span>').join('');list.before(head);
  }

  function supplyRowActive(row){
    if(row?.dataset?.active!=null)return row.dataset.active==='1';
    const label=row?.querySelector('[data-label="Catálogo"]');
    return !label||!/Ocult/i.test(label.textContent||'');
  }

  function ensureSupplyActionStyles(){
    if(document.getElementById('v2SupplyActionStyles'))return;
    const style=document.createElement('style');style.id='v2SupplyActionStyles';
    style.textContent='.supply-v2-head,.supply-v2-row{grid-template-columns:minmax(250px,1.7fr) .65fr .75fr .75fr .7fr auto!important}.supply-v2-actions{display:flex;gap:7px;justify-content:flex-end;align-items:center}.supply-v2-actions button{width:41px;height:41px;display:grid;place-items:center;padding:0;font-size:18px;border:1px solid #d0c7b8;background:#fffdf8;color:#39402e;border-radius:5px;cursor:pointer}.supply-v2-actions button[data-supply-active].is-active{background:#596044;color:#fff;border-color:#596044}.supply-v2-actions button:hover{border-color:#6a7051}.supply-v2-actions button[data-supply-delete]{color:#873e38}@media(max-width:900px){.supply-v2-head{display:none!important}.supply-v2-row{grid-template-columns:1fr!important}.supply-v2-actions{justify-content:flex-start}}';
    document.head.appendChild(style);
  }

  function decorateSupplyRows(){
    const root=typeof adminShell==='function'?adminShell():document;if(activeCatalog()!=='supplies'||!root)return;
    ensureSupplyActionStyles();
    const head=root.querySelector('.supply-v2-head');
    if(head&&!head.querySelector('[data-v2-supply-actions-head]')){const s=document.createElement('span');s.dataset.v2SupplyActionsHead='1';s.textContent='Acciones';head.appendChild(s)}
    root.querySelectorAll('.supply-v2-row').forEach(row=>{
      if(row.querySelector('.supply-v2-actions'))return;
      const id=row.querySelector('[data-supply]')?.dataset.supply;if(!id)return;
      const actions=document.createElement('span');actions.className='supply-v2-actions';actions.dataset.label='Acciones';
      actions.innerHTML='<button type="button" data-supply-active="'+id+'" class="'+(supplyRowActive(row)?'is-active':'')+'" title="'+(supplyRowActive(row)?'Inhabilitar / ocultar':'Habilitar / mostrar')+'" aria-label="Cambiar vigencia">✓</button><button type="button" data-supply-edit="'+id+'" title="Editar" aria-label="Editar">✎</button><button type="button" data-supply-duplicate="'+id+'" title="Duplicar" aria-label="Duplicar">⧉</button><button type="button" data-supply-delete="'+id+'" title="Borrar" aria-label="Borrar">🗑</button>';
      row.appendChild(actions);
    });
  }

  function rowUnavailable(row,active){
    if(active==='products'){
      const id=row.querySelector('[data-v2product]')?.dataset.v2product||row.querySelector('[data-visible]')?.dataset.visible;
      const item=(window.adminCache?.products||[]).find(x=>String(x.id)===String(id));
      if(item)return item.published===false;
    }
    if(active==='fragrances'){
      const id=row.querySelector('[data-v2frag]')?.dataset.v2frag||row.querySelector('[data-visible]')?.dataset.visible;
      const item=(window.adminCache?.fragrances||[]).find(x=>String(x.id)===String(id));
      if(item)return item.published===false;
    }
    if(active==='supplies'){
      if(row?.dataset?.active!=null)return row.dataset.active!=='1';
      const label=[...row.querySelectorAll('[data-label="Catálogo"]')].find(x=>/Activo|Ocult/i.test(x.textContent));
      const action=row.querySelector('[data-supply-active],[data-visible],input[data-active]');
      return label?/Ocult/i.test(label.textContent):action?!action.classList.contains('is-active'):false;
    }
    if(active==='categories'){
      const cb=row.querySelector('[data-catvisible],[data-visible]');
      return cb?!cb.checked:false;
    }
    const label=[...row.querySelectorAll('[data-label="Tienda"]')].find(x=>/Visible|Ocult/i.test(x.textContent));
    const action=row.querySelector('.admin-row-actions input[type="checkbox"],[data-visible]');
    return label?/Ocult/i.test(label.textContent):action?!action.checked:false;
  }

  function applyCanonicalHide(){
    const root=typeof adminShell==='function'?adminShell():document;
    const hide=root?.querySelector('[data-v2-hide]');if(!hide)return;
    const on=hide.checked,active=activeCatalog();
    root.querySelectorAll('.catalog-v2-list .catalog-v2-row').forEach(row=>{
      const shouldHide=on&&rowUnavailable(row,active);
      row.hidden=shouldHide;
      if(shouldHide)row.style.setProperty('display','none','important');
      else row.style.removeProperty('display');
    });
  }

  async function duplicateSupply(id){
    const r=await sb.from('supplies').select('*').eq('id',id).single();
    if(r.error||!r.data){alert('No se pudo leer el insumo para duplicarlo: '+(r.error?.message||'registro inexistente'));return}
    const x=r.data;
    const newColor=prompt('Nuevo color para el duplicado:',x.color||'');if(newColor===null)return;
    let base=String(x.purchase_name||'').trim();
    if(x.color){const esc=String(x.color).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');base=base.replace(new RegExp('\\s+'+esc+'$','i'),'').trim()}
    const suggested=(newColor.trim()?base+' '+newColor.trim():base+' copia').trim();
    const newName=prompt('Nombre del nuevo insumo:',suggested);if(newName===null||!newName.trim())return;
    const cr=await sb.rpc('next_supply_code',{p_type:x.type});if(cr.error){alert('No se pudo generar el código: '+cr.error.message);return}
    const d={code:cr.data,type:x.type,purchase_name:newName.trim(),description:x.description||null,stock_unit:x.stock_unit,stock:0,min_stock:x.min_stock,target_stock:x.target_stock,purchase_presentation:x.purchase_presentation||null,purchase_quantity:x.purchase_quantity,last_purchase_cost:x.last_purchase_cost,supplier:x.supplier||null,material:x.material||null,color:newColor.trim()||null,capacity_cc:x.capacity_cc,capacity_g:x.capacity_g,height_mm:x.height_mm,width_mm:x.width_mm,depth_mm:x.depth_mm,diameter_mm:x.diameter_mm,includes_lid:x.includes_lid,notes:x.notes||null,active:true};
    const ins=await sb.from('supplies').insert(d).select('id').single();
    if(ins.error){alert('No se pudo duplicar el insumo: '+ins.error.message);return}
    await window.supplyForm(ins.data.id);
  }

  async function deleteSupply(id){
    const use=await sb.from('product_supplies').select('product_id',{count:'exact',head:true}).eq('supply_id',id);
    if(use.error){alert('No se pudo validar el uso del insumo: '+use.error.message);return}
    if((use.count||0)>0){alert('Este insumo está usado en '+use.count+' producto(s). No se puede borrar. Podés destildarlo para inhabilitarlo sin perder relaciones.');return}
    if(!confirm('¿Borrar definitivamente este insumo? Esta acción no se puede deshacer.'))return;
    const r=await sb.from('supplies').delete().eq('id',id);if(r.error){alert('No se pudo borrar: '+r.error.message);return}
    if(typeof openSupplies==='function')openSupplies();
  }

  async function handleSupplyActions(e){
    if(activeCatalog()!=='supplies')return;
    const activeBtn=e.target.closest?.('[data-supply-active]');
    const editBtn=e.target.closest?.('[data-supply-edit]');
    const dupBtn=e.target.closest?.('[data-supply-duplicate]');
    const delBtn=e.target.closest?.('[data-supply-delete]');
    const control=activeBtn||editBtn||dupBtn||delBtn;if(!control)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(editBtn){window.supplyForm(editBtn.dataset.supplyEdit);return}
    if(dupBtn){duplicateSupply(dupBtn.dataset.supplyDuplicate);return}
    if(delBtn){deleteSupply(delBtn.dataset.supplyDelete);return}
    const id=activeBtn.dataset.supplyActive,row=activeBtn.closest('.supply-v2-row'),current=supplyRowActive(row),next=!current;
    activeBtn.disabled=true;
    try{
      const r=await sb.from('supplies').update({active:next}).eq('id',id);if(r.error)throw r.error;
      const label=row.querySelector('[data-label="Catálogo"]');if(label)label.textContent=next?'Activo':'Oculto';
      row.dataset.active=next?'1':'0';activeBtn.classList.toggle('is-active',next);activeBtn.title=next?'Inhabilitar / ocultar':'Habilitar / mostrar';
      queueMicrotask(applyCanonicalHide);
    }catch(err){alert('No se pudo cambiar la vigencia: '+(err?.message||err))}finally{activeBtn.disabled=false}
  }

  async function handleVisibilityClick(e){
    const root=typeof adminShell==='function'?adminShell():document;
    if(!root?.contains(e.target))return;
    const active=activeCatalog();
    if(active!=='products'&&active!=='fragrances')return;
    const control=e.target.closest?.('[data-visible]')||e.target.closest?.('.visibility-control')?.querySelector?.('[data-visible]');
    if(!control)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(control.dataset.v2Busy==='1')return;
    const id=control.dataset.visible;if(!id)return;
    const table=active==='products'?'products':'fragrances';
    const list=active==='products'?(window.adminCache?.products||[]):(window.adminCache?.fragrances||[]);
    const item=list.find(x=>String(x.id)===String(id));
    const current=item?item.published!==false:!!control.checked;
    const next=!current;
    control.dataset.v2Busy='1';control.disabled=true;
    try{
      const r=await sb.from(table).update({published:next}).eq('id',id);
      if(r.error)throw r.error;
      if(item)item.published=next;
      control.checked=next;
      const row=control.closest('.catalog-v2-row');
      const tienda=row?.querySelector('[data-label="Tienda"]');if(tienda)tienda.textContent=next?'Visible':active==='fragrances'?'Oculta':'Oculto';
      queueMicrotask(applyCanonicalHide);
    }catch(err){
      control.checked=current;
      alert('No se pudo cambiar la visibilidad: '+(err?.message||err));
    }finally{
      control.disabled=false;delete control.dataset.v2Busy;
    }
  }

  function reconcileCanonicalList(){ensureCanonicalHeader();decorateSupplyRows();applyCanonicalHide()}
  document.addEventListener('click',handleSupplyActions,true);
  document.addEventListener('click',handleVisibilityClick,true);
  document.addEventListener('change',e=>{if(e.target?.matches('[data-v2-hide],[data-visible],[data-catvisible],.admin-row-actions input[type="checkbox"]'))queueMicrotask(reconcileCanonicalList)});
  new MutationObserver(()=>queueMicrotask(reconcileCanonicalList)).observe(document.documentElement,{childList:true,subtree:true});

  loadV2ReadinessContext().catch(()=>{});
  queueMicrotask(reconcileCanonicalList);
})();
