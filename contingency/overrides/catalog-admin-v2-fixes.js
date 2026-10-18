/* Micha & Co — stable catalog behavior. Renderers own DOM; this file owns data/actions only. */
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
  function supplyRowActive(row){return row?.dataset?.active!=='0'}

  function rowUnavailable(row,active){
    if(active==='products'){
      const id=row.querySelector('[data-v2product]')?.dataset.v2product||row.querySelector('[data-visible]')?.dataset.visible;
      const item=(window.adminCache?.products||[]).find(x=>String(x.id)===String(id));
      return item?item.published===false:false;
    }
    if(active==='fragrances'){
      const id=row.querySelector('[data-v2frag]')?.dataset.v2frag||row.querySelector('[data-visible]')?.dataset.visible;
      const item=(window.adminCache?.fragrances||[]).find(x=>String(x.id)===String(id));
      return item?item.published===false:false;
    }
    if(active==='supplies')return row?.dataset?.active==='0';
    if(active==='categories'){
      const cb=row.querySelector('[data-catvisible],[data-visible]');return cb?!cb.checked:false;
    }
    return false;
  }

  function applyCanonicalHide(){
    const root=typeof adminShell==='function'?adminShell():document;
    const hide=root?.querySelector('[data-v2-hide]');if(!hide)return;
    const on=hide.checked,active=activeCatalog();
    root.querySelectorAll('.catalog-v2-list .catalog-v2-row').forEach(row=>{
      const shouldHide=on&&rowUnavailable(row,active);
      row.hidden=shouldHide;
      if(shouldHide)row.style.setProperty('display','none','important');else row.style.removeProperty('display');
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
    const activeBtn=e.target.closest?.('[data-supply-active]'),editBtn=e.target.closest?.('[data-supply-edit]'),dupBtn=e.target.closest?.('[data-supply-duplicate]'),delBtn=e.target.closest?.('[data-supply-delete]');
    const control=activeBtn||editBtn||dupBtn||delBtn;if(!control)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(editBtn){window.supplyForm(editBtn.dataset.supplyEdit);return}
    if(dupBtn){duplicateSupply(dupBtn.dataset.supplyDuplicate);return}
    if(delBtn){deleteSupply(delBtn.dataset.supplyDelete);return}
    const id=activeBtn.dataset.supplyActive,row=activeBtn.closest('.supply-v2-row'),current=supplyRowActive(row),next=!current;
    activeBtn.disabled=true;
    try{
      const r=await sb.from('supplies').update({active:next}).eq('id',id);if(r.error)throw r.error;
      row.dataset.active=next?'1':'0';activeBtn.classList.toggle('is-active',next);activeBtn.title=next?'Inhabilitar / ocultar':'Habilitar / mostrar';queueMicrotask(applyCanonicalHide);
    }catch(err){alert('No se pudo cambiar la vigencia: '+(err?.message||err))}finally{activeBtn.disabled=false}
  }

  async function handleVisibilityClick(e){
    const root=typeof adminShell==='function'?adminShell():document;if(!root?.contains(e.target))return;
    const active=activeCatalog();if(active!=='products'&&active!=='fragrances')return;
    const control=e.target.closest?.('[data-visible]');if(!control)return;
    e.stopPropagation();e.stopImmediatePropagation();
    if(control.dataset.v2Busy==='1')return;
    const id=control.dataset.visible;if(!id)return;
    const table=active==='products'?'products':'fragrances',list=active==='products'?(window.adminCache?.products||[]):(window.adminCache?.fragrances||[]),item=list.find(x=>String(x.id)===String(id));
    const current=item?item.published!==false:!!control.checked,next=!current;
    control.dataset.v2Busy='1';control.disabled=true;
    try{
      const r=await sb.from(table).update({published:next}).eq('id',id);if(r.error)throw r.error;
      if(item)item.published=next;control.checked=next;control.closest('.visibility-control')?.setAttribute('title',next?'Ocultar / inhabilitar':'Mostrar / habilitar');queueMicrotask(applyCanonicalHide);
    }catch(err){control.checked=current;alert('No se pudo cambiar la visibilidad: '+(err?.message||err))}finally{control.disabled=false;delete control.dataset.v2Busy}
  }

  document.addEventListener('click',handleSupplyActions,true);
  document.addEventListener('click',handleVisibilityClick,true);
  document.addEventListener('change',e=>{if(e.target?.matches('[data-v2-hide],[data-catvisible]'))queueMicrotask(applyCanonicalHide)});
  loadV2ReadinessContext().catch(()=>{});
})();
