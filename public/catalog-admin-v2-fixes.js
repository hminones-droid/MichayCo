/* Micha & Co — V2 compatibility fixes. Remove after legacy admin is retired. */
(function(){
  let usageByProduct={},suppliesById={};
  const legacyOpenCategories=window.openCategories;
  const legacySupplyForm=window.supplyForm;

  function v2Readiness(p){
    const missing=[];
    if(!p?.name)missing.push('nombre');
    if(!p?.category_id)missing.push('categoría');
    if(p?.price==null)missing.push('precio');
    if(typeof articlePhotos==='function'&&!articlePhotos(p.id)[0])missing.push('foto');
    const links=usageByProduct[p.id]||[];
    if(!links.length)missing.push('componentes');
    const stock=links.length&&links.every(x=>Number(suppliesById[x.supply_id]?.stock||0)>0)?1:0;
    return {missing,warnings:[],stock};
  }

  window.openCategories=async function(){
    const [linksR,suppliesR]=await Promise.all([
      sb.from('product_supplies').select('product_id,supply_id'),
      sb.from('supplies').select('id,stock')
    ]);
    usageByProduct=(linksR.data||[]).reduce((m,x)=>{(m[x.product_id]||(m[x.product_id]=[])).push(x);return m},{});
    suppliesById=(suppliesR.data||[]).reduce((m,x)=>(m[x.id]=x,m),{});
    window.productReadiness=v2Readiness;
    return legacyOpenCategories();
  };

  window.supplyForm=async function(id){
    await legacySupplyForm(id);
    const capacity=document.getElementById('supCapacity');
    if(capacity){
      const label=capacity.closest('label');
      if(label)label.childNodes[0].textContent='Capacidad líquida (cc) ';
      capacity.placeholder='Sólo difusores / sprays';
      const note=document.createElement('small');
      note.className='admin-help';
      note.textContent='Para velas no se carga capacidad en cc: el producto terminado usa peso neto en gramos.';
      label?.appendChild(note);
    }
  };
})();
