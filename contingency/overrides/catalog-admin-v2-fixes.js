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
    if(root.querySelector('.catalog-v2-head'))return;
    let labels=null;
    if(active==='products')labels=['Producto','Componentes','Precio','Estado','Acciones'];
    if(active==='fragrances')labels=['Fragancia','Fórmula','Total','Estado','Acciones'];
    if(!labels)return;
    const head=document.createElement('div');head.className='catalog-v2-head product-supply-head';head.setAttribute('aria-hidden','true');
    head.innerHTML=labels.map(x=>'<span>'+x+'</span>').join('');list.before(head);
  }

  function applyCanonicalHide(){
    const root=typeof adminShell==='function'?adminShell():document;
    const hide=root?.querySelector('[data-v2-hide]');if(!hide||!hide.checked)return;
    const active=activeCatalog();
    root.querySelectorAll('.catalog-v2-list .catalog-v2-row').forEach(row=>{
      let unavailable=false;
      if(active==='supplies')unavailable=[...row.querySelectorAll('[data-label="Catálogo"]')].some(x=>x.textContent.trim()==='Oculto');
      else if(active==='categories'){const cb=row.querySelector('[data-catvisible]');unavailable=cb?!cb.checked:false}
      else {const label=[...row.querySelectorAll('[data-label="Tienda"]')].find(x=>/Visible|Ocult/i.test(x.textContent));const action=row.querySelector('.admin-row-actions input[type="checkbox"], [data-visible]');unavailable=label?/Ocult/i.test(label.textContent):action?!action.checked:false}
      row.hidden=unavailable;
    });
  }

  function reconcileCanonicalList(){ensureCanonicalHeader();if(document.querySelector('[data-v2-hide]:checked'))applyCanonicalHide()}
  document.addEventListener('change',e=>{if(e.target?.matches('[data-v2-hide],.admin-row-actions input[type="checkbox"],[data-visible],[data-catvisible]'))queueMicrotask(reconcileCanonicalList)});
  new MutationObserver(()=>queueMicrotask(reconcileCanonicalList)).observe(document.documentElement,{childList:true,subtree:true});

  loadV2ReadinessContext().catch(()=>{});
  queueMicrotask(reconcileCanonicalList);
})();
