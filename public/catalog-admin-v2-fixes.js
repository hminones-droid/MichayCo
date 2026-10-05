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
    // This is manufacturing capacity from input stock, never finished-product stock.
    // Fixed/per-unit relations with an explicit quantity are directly resolvable.
    // Formula/capacity/length rules require the manufacturing resolver and are not guessed.
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

    // Catalog completeness is structural. Current input stock must never make a
    // correctly configured product incomplete or not sellable: finished stock is separate.
    if(p?.published!==false&&manufacturingCapacity===0)warnings.push('sin capacidad de fabricación con el stock actual de insumos');
    if(p?.published!==false&&manufacturingCapacity===null&&links.length)warnings.push('capacidad de fabricación pendiente de resolver por receta/capacidad');
    if(p?.published!==false&&missing.length)warnings.push('visible incompleto');

    return {
      missing,
      warnings,
      manufacturingCapacity,
      // Legacy alias kept temporarily so older UI consumers do not break. It means
      // manufacturing capacity, NOT finished stock, and must be retired with legacy admin.
      stock:manufacturingCapacity,
      state:missing.length?'incomplete':'complete',
      label:missing.length?'Falta '+missing.join(' · '):'Configuración completa',
      salesReady:!missing.length&&p?.published!==false
    };
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

  loadV2ReadinessContext().catch(()=>{});
})();
