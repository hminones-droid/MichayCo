/* Micha & Co — V2 compatibility fixes. Remove after legacy admin is retired. */
(function(){
  let usageByProduct={},suppliesById={};
  const v2OpenCategories=window.openCategories;
  const v2SupplyForm=window.supplyForm;

  function v2Readiness(p){
    const missing=[],warnings=[];
    if(!p?.name)missing.push('nombre');
    if(!p?.category_id)missing.push('categoría');
    if(p?.price==null)missing.push('precio');
    if(typeof articlePhotos==='function'&&!articlePhotos(p.id)[0])missing.push('foto');
    const links=usageByProduct[p.id]||[];
    if(!links.length)missing.push('componentes');
    const stock=links.length&&links.every(x=>Number(suppliesById[x.supply_id]?.stock||0)>0)?1:0;
    if(p?.published!==false&&stock<=0)warnings.push('sin stock disponible');
    if(p?.published!==false&&missing.length)warnings.push('visible incompleto');
    return {missing,warnings,stock,state:missing.length?'incomplete':'complete',label:missing.length?'Falta '+missing.join(' · '):'Configuración completa',salesReady:!missing.length&&p?.published!==false&&stock>0};
  }

  async function loadV2ReadinessContext(){
    const [linksR,suppliesR]=await Promise.all([
      sb.from('product_supplies').select('product_id,supply_id'),
      sb.from('supplies').select('id,stock')
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
