/* Micha & Co — canonical admin interaction + layout language. */
(function(){
  const svgTrash=()=>typeof window.trashIcon==='function'?window.trashIcon():'🗑';
  function iconize(btn,kind,title){
    if(!btn)return;
    if(btn.dataset.canonicalIcon!==kind){
      btn.dataset.canonicalIcon=kind;
      btn.classList.add('canonical-icon-btn');
      if(kind==='edit')btn.textContent='✎';
      else if(kind==='duplicate')btn.textContent='⧉';
      else if(kind==='trash'){btn.classList.add('is-trash');btn.innerHTML=svgTrash()}
      else if(kind==='clear')btn.textContent='×';
    }
    if(btn.title!==title)btn.title=title;
    if(btn.getAttribute('aria-label')!==title)btn.setAttribute('aria-label',title);
  }
  function fieldClass(root,id,cls){
    const input=root.querySelector('#'+id);if(!input)return null;
    const label=input.closest('label');if(label)label.classList.add(cls);
    return label;
  }
  function moveChecksIntoBand(form,ids){
    const labels=ids.map(id=>form.querySelector('#'+id)?.closest('label')).filter(Boolean);
    if(!labels.length)return;
    let band=form.querySelector(':scope > .canonical-checks');
    if(!band){band=document.createElement('div');band.className='canonical-checks';const first=labels[0];first.parentNode.insertBefore(band,first)}
    labels.forEach(label=>{if(label.parentElement!==band)band.appendChild(label)});
  }
  function canonicalizeForms(root){
    const product=root.querySelector('#v2pName');
    if(product){
      const form=product.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-product-form');
        fieldClass(form,'v2pName','f-name');fieldClass(form,'v2pCategory','f-category');fieldClass(form,'v2pPrice','f-price');fieldClass(form,'v2pFinishedStock','f-stock');fieldClass(form,'v2pOrder','f-order');fieldClass(form,'v2pShort','f-short');fieldClass(form,'v2pDesc','f-description');
        moveChecksIntoBand(form,['v2pFeatured','v2pFragrance','v2pPublished']);
      }
    }
    const supply=root.querySelector('#supName');
    if(supply){
      const form=supply.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-supply-form');
        const grids=[...form.querySelectorAll('.catalog-v2-form-grid')];if(grids[0])grids[0].classList.add('supply-commercial-grid');if(grids[1])grids[1].classList.add('supply-physical-grid');
        const map={supType:'f-type',supName:'f-supply-name',supUnit:'f-unit',supStock:'f-current-stock',supMin:'f-min-stock',supTarget:'f-target-stock',supPresentation:'f-presentation',supQty:'f-presentation-qty',supCost:'f-last-cost',supSupplier:'f-supplier',supMaterial:'f-material',supColor:'f-color',supCapacity:'f-capacity',supCapacityG:'f-capacity-g',supHeight:'f-height',supWidth:'f-width',supDepth:'f-depth',supDiameter:'f-diameter',supLid:'f-lid',supDesc:'f-description',supNotes:'f-notes'};
        Object.entries(map).forEach(([id,cls])=>fieldClass(form,id,cls));
      }
    }
    const category=root.querySelector('#catName');
    if(category){const form=category.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-category-form');fieldClass(form,'catName','f-category-name');fieldClass(form,'catOrder','f-category-order')}}
    const fragrance=root.querySelector('#v2fName');
    if(fragrance){const form=fragrance.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-fragrance-form');fieldClass(form,'v2fName','f-frag-name');fieldClass(form,'v2fCode','f-frag-code');fieldClass(form,'v2fFamily','f-frag-family');fieldClass(form,'v2fOrder','f-frag-order');fieldClass(form,'v2fDesc','f-frag-desc')}}
    const component=root.querySelector('#psSupply');
    if(component){const form=component.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-component-form');fieldClass(form,'psSupply','f-component-supply');fieldClass(form,'psRole','f-component-role');fieldClass(form,'psRule','f-component-rule');fieldClass(form,'psQty','f-component-qty');fieldClass(form,'psContainer','f-component-container');fieldClass(form,'psNotes','f-component-notes')}}
    const content=root.querySelector('#contentTagline');
    if(content){const form=content.closest('.admin-form');if(form)form.classList.add('canonical-admin-form','canonical-content-form')}
    const typography=root.querySelector('#fontHeading');
    if(typography){const form=typography.closest('.admin-form');if(form)form.classList.add('canonical-admin-form','canonical-typography-form')}
  }
  function canonicalizeComponentRows(root){
    root.querySelectorAll('.product-supply-row').forEach(row=>{
      const replace=row.querySelector('[data-replace-supply]'),remove=row.querySelector('[data-remove]');
      if(!replace&&!remove)return;
      let actions=row.querySelector('.canonical-row-actions');
      if(!actions){actions=document.createElement('div');actions.className='canonical-row-actions';row.appendChild(actions)}
      if(replace){if(replace.parentElement!==actions)actions.appendChild(replace);iconize(replace,'edit','Cambiar componente')}
      if(remove){if(remove.parentElement!==actions)actions.appendChild(remove);iconize(remove,'trash','Quitar componente')}
    });
  }
  function canonicalizeKnownActions(root){
    root.querySelectorAll('[data-product-duplicate],[data-supply-duplicate],[data-clone]').forEach(b=>iconize(b,'duplicate','Duplicar'));
    root.querySelectorAll('.v2Remove').forEach(b=>iconize(b,'trash','Quitar'));
    root.querySelectorAll('button[data-remove]').forEach(b=>{if(!b.closest('.product-supply-row'))iconize(b,'trash','Quitar')});
    root.querySelectorAll('button.filter-clear').forEach(b=>iconize(b,'clear','Limpiar filtros'));
    root.querySelectorAll('button').forEach(b=>{
      const txt=(b.textContent||'').trim().toLowerCase(),title=(b.title||'').toLowerCase();
      const inRow=!!b.closest('.catalog-v2-row,.admin-row,.product-monitor-actions,.catalog-v2-row-actions,.catalog-actions');
      if(!inRow)return;
      if(txt==='editar'||title==='editar')iconize(b,'edit','Editar');
      else if(txt==='crear similar'||txt==='duplicar'||title.includes('similar')||title.includes('duplicar'))iconize(b,'duplicate','Duplicar');
      else if(txt==='eliminar'||txt==='borrar'||title.startsWith('eliminar'))iconize(b,'trash','Eliminar');
      else if(txt==='quitar')iconize(b,'trash','Quitar');
    });
    root.querySelectorAll('.visibility-control').forEach(l=>{
      if(l.title!=='Visible / habilitado')l.title='Visible / habilitado';
      if(l.getAttribute('aria-label')!=='Visible / habilitado')l.setAttribute('aria-label','Visible / habilitado');
    });
  }
  let scheduled=false;
  function run(){
    scheduled=false;
    const root=typeof window.adminShell==='function'?window.adminShell():document;
    canonicalizeForms(root);canonicalizeComponentRows(root);canonicalizeKnownActions(root);
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(run)}
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',schedule);schedule();
})();
