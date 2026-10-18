/* Micha & Co — supply form/duplication fixes. */
(function(){
  const previousSupplyForm=window.supplyForm;
  const physicalTypes=new Set(['container','component']);

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
  function escapeRegex(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
  function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}

  async function loadNameSuggestions(type,datalist){
    if(!datalist)return;
    const r=await sb.from('supplies').select('purchase_name,type').eq('type',type).order('purchase_name');
    if(r.error){datalist.innerHTML='';return}
    const names=[...new Set((r.data||[]).map(x=>String(x.purchase_name||'').trim()).filter(Boolean))];
    datalist.innerHTML=names.map(x=>'<option value="'+escapeHtml(x)+'"></option>').join('');
  }

  window.supplyForm=async function(id){
    await previousSupplyForm(id);
    const type=document.getElementById('supType');
    const name=document.getElementById('supName');
    if(!type||!name)return;

    const label=name.closest('label');
    if(label&&label.childNodes[0])label.childNodes[0].textContent='Nombre del insumo ';
    name.setAttribute('autocomplete','off');
    name.setAttribute('spellcheck','false');
    name.setAttribute('list','supplyNameSuggestions');
    name.placeholder='Escribí un nombre o elegí uno existente de este tipo';

    let datalist=document.getElementById('supplyNameSuggestions');
    if(!datalist){
      datalist=document.createElement('datalist');
      datalist.id='supplyNameSuggestions';
      name.insertAdjacentElement('afterend',datalist);
    }
    const refresh=()=>loadNameSuggestions(type.value,datalist);
    type.addEventListener('change',refresh);
    await refresh();

    const active=document.getElementById('supActive');
    const activeLabel=active?.closest('label');
    if(activeLabel)activeLabel.style.display='none';
  };

  function suggestedDuplicateName(x,newColor){
    const original=String(x.purchase_name||'').trim();
    const next=String(newColor||'').trim();
    if(!next)return original+' copia';
    const old=String(x.color||'').trim();
    if(old){
      const re=new RegExp('(^|\\s)'+escapeRegex(old)+'(?=\\s|$)','i');
      if(re.test(original))return original.replace(re,(m,prefix)=>prefix+next).replace(/\\s+/g,' ').trim();
      if(normalize(old)==='transparente')return (original+' '+next).trim();
    }
    return (original+' '+next).trim();
  }

  async function duplicateSupplyFixed(id){
    const r=await sb.from('supplies').select('*').eq('id',id).single();
    if(r.error||!r.data){alert('No se pudo leer el insumo para duplicarlo: '+(r.error?.message||'registro inexistente'));return}
    const x=r.data;

    let newColor=String(x.color||'');
    if(physicalTypes.has(x.type)){
      const entered=prompt('Nuevo color para el duplicado:','');
      if(entered===null)return;
      newColor=entered.trim();
    }

    const suggested=suggestedDuplicateName(x,newColor);
    const newName=prompt('Nombre del nuevo insumo:',suggested);
    if(newName===null||!newName.trim())return;

    const cr=await sb.rpc('next_supply_code',{p_type:x.type});
    if(cr.error){alert('No se pudo generar el código: '+cr.error.message);return}
    const d={
      code:cr.data,
      type:x.type,
      purchase_name:newName.trim(),
      description:x.description||null,
      stock_unit:x.stock_unit,
      stock:0,
      min_stock:x.min_stock,
      target_stock:x.target_stock,
      purchase_presentation:x.purchase_presentation||null,
      purchase_quantity:x.purchase_quantity,
      last_purchase_cost:x.last_purchase_cost,
      supplier:x.supplier||null,
      material:x.material||null,
      color:physicalTypes.has(x.type)?(newColor||null):(x.color||null),
      capacity_cc:x.capacity_cc,
      capacity_g:x.capacity_g,
      height_mm:x.height_mm,
      width_mm:x.width_mm,
      depth_mm:x.depth_mm,
      diameter_mm:x.diameter_mm,
      includes_lid:x.includes_lid,
      notes:x.notes||null,
      active:true
    };
    const ins=await sb.from('supplies').insert(d).select('id').single();
    if(ins.error){alert('No se pudo duplicar el insumo: '+ins.error.message);return}
    await window.supplyForm(ins.data.id);
  }

  window.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-supply-duplicate]');
    if(!button)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    duplicateSupplyFixed(button.dataset.supplyDuplicate).catch(err=>alert('No se pudo duplicar el insumo: '+(err?.message||err)));
  },true);
})();

/* Canonical table contract: Categories header and rows must share one 7-column grid. */
(function(){
  const style=document.createElement('style');
  style.id='canonicalCategoryAlignment';
  style.textContent='.catalog-v2-head.canonical-categories-head:has(+ #categoryList),#categoryList>.catalog-v2-row{grid-template-columns:minmax(230px,1.4fr) 82px 82px 88px 92px 78px minmax(145px,max-content)!important;column-gap:10px!important}.catalog-v2-head.canonical-categories-head:has(+ #categoryList)>span:not(:first-child):not(:last-child){justify-content:center!important;text-align:center!important}.catalog-v2-head.canonical-categories-head:has(+ #categoryList)>span:last-child{justify-content:flex-end!important;text-align:right!important}';
  document.head.appendChild(style);
})();
