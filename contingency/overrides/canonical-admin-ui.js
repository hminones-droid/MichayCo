/* Micha & Co — canonical admin UI, bounded/screen-driven edition.
   IMPORTANT: no MutationObserver, no global navigation interception, no continuous DOM reparenting. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const trash=()=>typeof window.trashIcon==='function'?window.trashIcon():'🗑';

  function iconize(btn,kind,title){
    if(!btn)return;
    btn.classList.add('canonical-icon-btn');
    btn.dataset.canonicalIcon=kind;
    if(kind==='edit')btn.textContent='✎';
    else if(kind==='duplicate')btn.textContent='⧉';
    else if(kind==='trash'){btn.classList.add('is-trash');btn.innerHTML=trash();}
    else if(kind==='clear')btn.textContent='×';
    btn.title=title;btn.setAttribute('aria-label',title);
  }
  function fieldClass(form,id,cls){const el=$('#'+id,form);const lab=el?.closest('label');if(lab)lab.classList.add(cls);return lab;}
  function forms(root){
    let el=$('#v2pName',root),form=el?.closest('.admin-form');
    if(form){form.classList.add('canonical-admin-form','canonical-product-form');[['v2pName','f-name'],['v2pCategory','f-category'],['v2pPrice','f-price'],['v2pFinishedStock','f-stock'],['v2pOrder','f-order'],['v2pShort','f-short'],['v2pDesc','f-description']].forEach(x=>fieldClass(form,...x));const labels=['v2pFeatured','v2pFragrance','v2pPublished'].map(id=>$('#'+id,form)?.closest('label')).filter(Boolean);if(labels.length){let band=$(':scope>.canonical-checks',form);if(!band){band=document.createElement('div');band.className='canonical-checks';labels[0].before(band);}labels.forEach(l=>{if(l.parentElement!==band)band.appendChild(l);});}}
    el=$('#supName',root);form=el?.closest('.admin-form');
    if(form){form.classList.add('canonical-admin-form','canonical-supply-form');const g=$$('.catalog-v2-form-grid',form);g[0]?.classList.add('supply-commercial-grid');g[1]?.classList.add('supply-physical-grid');const m={supType:'f-type',supName:'f-supply-name',supUnit:'f-unit',supStock:'f-current-stock',supMin:'f-min-stock',supTarget:'f-target-stock',supPresentation:'f-presentation',supQty:'f-presentation-qty',supCost:'f-last-cost',supSupplier:'f-supplier',supMaterial:'f-material',supColor:'f-color',supCapacity:'f-capacity',supCapacityG:'f-capacity-g',supHeight:'f-height',supWidth:'f-width',supDepth:'f-depth',supDiameter:'f-diameter',supLid:'f-lid',supDesc:'f-description',supNotes:'f-notes'};Object.entries(m).forEach(x=>fieldClass(form,...x));}
    el=$('#catName',root);form=el?.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-category-form');fieldClass(form,'catName','f-category-name');fieldClass(form,'catOrder','f-category-order');}
    el=$('#v2fName',root);form=el?.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-fragrance-form');[['v2fName','f-frag-name'],['v2fCode','f-frag-code'],['v2fFamily','f-frag-family'],['v2fOrder','f-frag-order'],['v2fDesc','f-frag-desc']].forEach(x=>fieldClass(form,...x));}
    el=$('#psSupply',root);form=el?.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-component-form');[['psSupply','f-component-supply'],['psRole','f-component-role'],['psRule','f-component-rule'],['psQty','f-component-qty'],['psContainer','f-component-container'],['psNotes','f-component-notes']].forEach(x=>fieldClass(form,...x));}
  }
  function actions(root){
    $$('[data-product-duplicate],[data-supply-duplicate],[data-clone]',root).forEach(b=>iconize(b,'duplicate','Duplicar'));
    $$('.v2Remove,button[data-remove]',root).forEach(b=>iconize(b,'trash','Quitar'));
    $$('button.filter-clear',root).forEach(b=>iconize(b,'clear','Limpiar filtros'));
    $$('button',root).forEach(b=>{if(b.dataset.canonicalIcon)return;const t=(b.textContent||'').trim().toLowerCase(),ti=(b.title||'').toLowerCase();if(!(b.closest('.catalog-v2-row,.admin-row,.product-monitor-actions,.catalog-v2-row-actions,.catalog-actions,.product-supply-row')))return;if(t==='editar'||ti==='editar')iconize(b,'edit','Editar');else if(t==='duplicar'||t==='crear similar'||ti.includes('duplicar')||ti.includes('similar'))iconize(b,'duplicate','Duplicar');else if(t==='eliminar'||t==='borrar'||t==='quitar'||ti.startsWith('eliminar'))iconize(b,'trash',t==='quitar'?'Quitar':'Eliminar');});
    $$('.visibility-control',root).forEach(l=>{l.title='Visible / habilitado';l.setAttribute('aria-label','Visible / habilitado');});
  }
  function componentRows(root){
    $$('.product-supply-row',root).forEach(row=>{const rep=$('[data-replace-supply]',row),rem=$('[data-remove]',row);if(!rep&&!rem)return;let box=$(':scope>.canonical-row-actions',row);if(!box){box=document.createElement('div');box.className='canonical-row-actions';row.appendChild(box);}if(rep){box.appendChild(rep);iconize(rep,'edit','Cambiar componente');}if(rem){box.appendChild(rem);iconize(rem,'trash','Quitar componente');}});
  }
  function compactExcel(root){
    $$('button,label',root).forEach(el=>{const t=(el.textContent||'').trim().toLowerCase();if(el.dataset.compactExcel)return;if(t.includes('exportar excel')||t.includes('bajar planilla')){el.dataset.compactExcel='1';el.innerHTML='▦↓ <span>XLSX</span>';el.title='Exportar Excel';}else if(t.includes('importar excel')||t.includes('subir planilla')){const inp=$('input[type=file]',el);el.dataset.compactExcel='1';el.innerHTML='▦↑ <span>XLSX</span>';if(inp)el.appendChild(inp);el.title='Importar Excel';}});
  }
  function photoPage(root){const grid=$('#photoGrid',root);if(grid)(grid.closest('.admin-work')||grid.parentElement)?.classList.add('canonical-photo-page');}
  function home(){
    const w=$('#catalogWorkspace');if(!w||w.dataset.canonicalHome)return;const h=$('h2',w);if(!h||!/catálogo central/i.test(h.textContent||''))return;
    w.dataset.canonicalHome='ready';w.classList.add('canonical-home');
    w.innerHTML=`<header class="canonical-home-header"><div><span class="eyebrow">INICIO</span><h2>Resumen operativo</h2><p>Lo que requiere atención para mantener la tienda lista para vender y entregar.</p></div><div class="canonical-home-status">Actualizando…</div></header><section class="home-metrics"><div class="home-metric"><span>PRODUCTOS</span><b>—</b></div><div class="home-metric"><span>INSUMOS</span><b>—</b></div><div class="home-metric"><span>FRAGANCIAS</span><b>—</b></div><div class="home-metric"><span>PEDIDOS ACTIVOS</span><b>—</b></div></section><div class="home-grid"><section class="home-panel"><div class="home-panel-head"><h3>Requiere atención</h3><small>Excepciones operativas</small></div><div class="attention-list">${[['Productos para revisar','Datos o configuración pendientes.'],['Productos sin stock','No pueden venderse hasta reponer existencias.'],['Productos sin foto','Necesitan fotografía para estar completos.'],['Productos sin precio','Requieren precio comercial.'],['Insumos bajo mínimo','Control de reposición.'],['Pedidos en circuito','Pago, preparación o entrega pendientes.']].map(([a,b])=>`<div class="attention-row"><span class="attention-count">—</span><span class="attention-copy"><b>${esc(a)}</b><small>${esc(b)}</small></span></div>`).join('')}</div></section><aside class="home-panel"><div class="home-panel-head"><h3>Salud operativa</h3><small>estado actual</small></div><div class="health-line"><div class="health-caption"><span>Catálogo listo para vender</span><b>—</b></div><div class="health-track"><span style="width:0%"></span></div></div><div class="health-line"><div class="health-caption"><span>Insumos sobre mínimo</span><b>—</b></div><div class="health-track"><span style="width:0%"></span></div></div></aside></div>`;
  }
  function apply(){const root=typeof window.adminShell==='function'?window.adminShell():document;forms(root);componentRows(root);actions(root);compactExcel(root);photoPage(root);home();document.documentElement.setAttribute('data-admin-canonical','safe');}
  function burst(){[0,60,180].forEach(ms=>setTimeout(()=>{try{apply();}catch(e){console.error('canonical apply',e);}},ms));}
  document.addEventListener('DOMContentLoaded',burst,{once:true});
  document.addEventListener('click',e=>{if(e.target.closest('button,a,[role=button],summary'))burst();},true);
  apply();
})();