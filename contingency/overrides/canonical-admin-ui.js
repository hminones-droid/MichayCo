/* Micha & Co — canonical admin interaction language. */
(function(){
  const svgTrash=()=>typeof window.trashIcon==='function'?window.trashIcon():'🗑';
  function iconize(btn,kind,title){
    if(!btn||btn.dataset.canonicalIcon===kind)return;
    btn.dataset.canonicalIcon=kind;
    btn.classList.add('canonical-icon-btn');
    btn.title=title;btn.setAttribute('aria-label',title);
    if(kind==='edit'){btn.textContent='✎'}
    else if(kind==='duplicate'){btn.textContent='⧉'}
    else if(kind==='trash'){btn.classList.add('is-trash');btn.innerHTML=svgTrash()}
  }
  function canonicalizeComponentRows(root){
    root.querySelectorAll('.product-supply-row').forEach(row=>{
      const replace=row.querySelector('[data-replace-supply]');
      const remove=row.querySelector('[data-remove]');
      if(!replace&&!remove)return;
      let actions=row.querySelector('.canonical-row-actions');
      if(!actions){actions=document.createElement('div');actions.className='canonical-row-actions';row.appendChild(actions)}
      if(replace){actions.appendChild(replace);iconize(replace,'edit','Cambiar componente')}
      if(remove){actions.appendChild(remove);iconize(remove,'trash','Quitar componente')}
    });
  }
  function canonicalizeKnownActions(root){
    root.querySelectorAll('[data-product-duplicate],[data-supply-duplicate],[data-clone]').forEach(b=>iconize(b,'duplicate','Duplicar'));
    root.querySelectorAll('.v2Remove').forEach(b=>iconize(b,'trash','Quitar'));
    root.querySelectorAll('button').forEach(b=>{
      const txt=(b.textContent||'').trim().toLowerCase();
      const title=(b.title||'').toLowerCase();
      const inRow=!!b.closest('.catalog-v2-row,.admin-row,.product-monitor-actions,.catalog-v2-row-actions');
      if(!inRow)return;
      if(txt==='editar'||title==='editar')iconize(b,'edit','Editar');
      else if(txt==='crear similar'||txt==='duplicar'||title.includes('similar')||title.includes('duplicar'))iconize(b,'duplicate','Duplicar');
      else if(txt==='eliminar'||txt==='borrar'||title==='eliminar')iconize(b,'trash','Eliminar');
    });
    root.querySelectorAll('.visibility-control').forEach(l=>{l.title='Visible / habilitado';l.setAttribute('aria-label','Visible / habilitado')});
  }
  function run(){const root=typeof window.adminShell==='function'?window.adminShell():document;canonicalizeComponentRows(root);canonicalizeKnownActions(root)}
  new MutationObserver(()=>queueMicrotask(run)).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',run);queueMicrotask(run);
})();
