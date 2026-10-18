/* Micha & Co — canonical admin UI, bounded/screen-driven edition.
   No MutationObserver, no global navigation interception, no continuous DOM reparenting. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const trash=()=>typeof window.trashIcon==='function'?window.trashIcon():'🗑';

  function injectCss(){
    if($('#canonicalSafeLayoutCss'))return;
    const st=document.createElement('style');st.id='canonicalSafeLayoutCss';st.textContent=`
      .admin-kpis{display:none!important}
      body:has(#catalogWorkspace.canonical-table-screen),body:has(#catalogWorkspace.canonical-stock-screen),body:has(#catalogWorkspace.canonical-home){overflow:hidden!important}
      body:has(#catalogWorkspace.canonical-table-screen) main.admin-main,body:has(#catalogWorkspace.canonical-stock-screen) main.admin-main,body:has(#catalogWorkspace.canonical-home) main.admin-main{height:100vh!important;overflow:hidden!important;box-sizing:border-box!important}

      #catalogWorkspace.canonical-table-screen{height:calc(100vh - 34px)!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;box-sizing:border-box!important}
      .canonical-table-screen>.admin-toolbar,.canonical-table-screen>.catalog-v2-toolbar,.canonical-table-screen>.catalog-v2-controls,.canonical-table-screen>.catalog-v2-head,.canonical-table-screen>.catalog-import-result{flex:0 0 auto!important}
      .canonical-table-screen>.catalog-v2-list{flex:1 1 auto!important;min-height:0!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;margin:0!important;padding:0!important}
      .canonical-table-screen>.catalog-v2-head{height:30px!important;min-height:30px!important;max-height:30px!important;margin:0!important;padding:0 10px!important;align-items:center!important;border-bottom:1px solid #d8d0c4!important;background:#fbf9f4!important;box-sizing:border-box!important;z-index:5!important}
      .canonical-table-screen>.catalog-v2-head>span{height:30px!important;display:flex!important;align-items:center!important;margin:0!important;padding:0!important;line-height:1!important;white-space:nowrap!important;font-size:10px!important;letter-spacing:.55px!important;text-transform:uppercase!important;color:#68655f!important}
      .canonical-table-screen .catalog-v2-row{margin:0!important;min-height:45px!important;box-sizing:border-box!important}
      .canonical-table-screen .catalog-v2-row[hidden]{display:none!important}

      .canonical-products-head,.canonical-product-row{grid-template-columns:minmax(320px,1fr) 118px 70px 88px minmax(150px,max-content)!important;column-gap:12px!important}
      .canonical-products-head>span:nth-child(2),.canonical-products-head>span:nth-child(3),.canonical-products-head>span:nth-child(4){justify-content:center!important;text-align:center!important}
      .canonical-products-head>span:last-child{justify-content:flex-end!important;text-align:right!important}
      .canonical-product-row>.cell-money,.canonical-product-row>.cell-number,.canonical-product-row>[data-label="Completitud"]{justify-self:center!important;text-align:center!important}
      .canonical-product-row>.canonical-row-actions{grid-column:5!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;white-space:nowrap!important}
      .canonical-product-row>.cell-visible{display:none!important}

      #categoryList+.unused{display:none!important}
      .canonical-categories-head,#categoryList>.catalog-v2-row{grid-template-columns:minmax(230px,1.4fr) 82px 82px 88px 92px 78px 76px 98px!important;column-gap:10px!important}
      .canonical-categories-head>span:not(:first-child):not(:last-child){justify-content:center!important;text-align:center!important}
      .canonical-categories-head>span:last-child{justify-content:flex-end!important;text-align:right!important}
      #categoryList>.catalog-v2-row>span,#categoryList>.catalog-v2-row>.category-alert-count,#categoryList>.catalog-v2-row>.visibility-control{justify-self:center!important;text-align:center!important}
      #categoryList>.catalog-v2-row>.catalog-v2-row-actions{justify-self:end!important}

      .canonical-supplies-head,.supply-v2-row{grid-template-columns:minmax(260px,1.65fr) 105px 112px 125px 112px 158px!important;column-gap:12px!important}
      .canonical-supplies-head>span:nth-child(n+2):not(:last-child){justify-content:center!important;text-align:center!important}
      .canonical-supplies-head>span:last-child{justify-content:flex-end!important;text-align:right!important}
      .supply-v2-row>[data-label="Stock"],.supply-v2-row>[data-label="Usado en"],.supply-v2-row>[data-label="Costo unit."],.supply-v2-row>[data-label="Estado"]{justify-self:center!important;text-align:center!important}
      .supply-v2-row>.supply-v2-actions{justify-self:end!important}

      .canonical-fragrances-head,.canonical-fragrance-row{grid-template-columns:minmax(260px,1.05fr) minmax(340px,1.35fr) 92px minmax(150px,max-content)!important;column-gap:14px!important}
      .canonical-fragrances-head>span:nth-child(2){justify-content:flex-start!important;text-align:left!important}
      .canonical-fragrances-head>span:nth-child(3){justify-content:center!important;text-align:center!important}
      .canonical-fragrances-head>span:last-child{justify-content:flex-end!important;text-align:right!important}
      .canonical-fragrance-row>[data-label="Composición"]{justify-self:stretch!important;text-align:left!important;min-width:0!important}
      .canonical-fragrance-row>[data-label="Composición"] small{display:block!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .canonical-fragrance-row>[data-label="Completitud"]{justify-self:center!important;text-align:center!important}
      .canonical-fragrance-row>.canonical-row-actions{grid-column:4!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;white-space:nowrap!important}
      .canonical-fragrance-row>[data-label="Tienda"]{display:none!important}

      .canonical-row-actions .visibility-control{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;min-width:34px!important;margin:0!important;border:1px solid #cfc6b8!important;border-radius:5px!important;background:#fffdf8!important;cursor:pointer!important;position:relative!important}
      .canonical-row-actions .visibility-control input{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;opacity:0!important;cursor:pointer!important}
      .canonical-row-actions .visibility-control:has(input:checked){background:#596044!important;border-color:#596044!important;color:#fff!important}
      .canonical-row-actions .visibility-control:before{content:'✓';font-size:20px!important;line-height:1!important;color:#b8b9b2!important}
      .canonical-row-actions .visibility-control:has(input:checked):before{color:#fff!important}
      .canonical-row-actions .visibility-control>span{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important}

      #catalogWorkspace.canonical-stock-screen{height:calc(100vh - 34px)!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;box-sizing:border-box!important}
      .canonical-stock-screen>.admin-toolbar,.canonical-stock-screen>.sheet-filters,.canonical-stock-screen>.grid-msg{flex:0 0 auto!important}
      .canonical-stock-screen>#stockOverview,.canonical-stock-screen>.stock-overview{display:none!important}
      .canonical-stock-screen>.sheet-tabs{display:none!important}
      .canonical-stock-screen>.sheet-filters{display:flex!important;align-items:flex-end!important;gap:12px!important;margin:4px 0 8px!important;padding:8px 10px!important;min-height:58px!important;box-sizing:border-box!important;background:#f0eae0!important;border:1px solid #d8d0c4!important}
      .canonical-stock-screen>.sheet-filters label{margin:0!important;gap:4px!important}
      .canonical-stock-screen>.sheet-filters label:first-child{flex:0 1 520px!important;max-width:520px!important}
      .canonical-stock-screen>.sheet-filters select{height:38px!important;min-height:38px!important;padding:0 10px!important}
      .canonical-stock-screen>.sheet-filters .check{display:flex!important;align-items:center!important;gap:7px!important;min-height:38px!important;padding-bottom:0!important;white-space:nowrap!important}
      .canonical-stock-screen>.sheet-filters .check input{width:17px!important;height:17px!important;min-width:17px!important;margin:0!important}
      .canonical-stock-screen>.sheet-wrap{flex:1 1 auto!important;min-height:0!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;margin:0!important;border:1px solid #d8d0c4!important}
      .canonical-stock-screen .stock-sheet{width:100%!important;table-layout:fixed!important;border-collapse:collapse!important}
      .canonical-stock-screen .stock-sheet thead th{position:sticky!important;top:0!important;z-index:6!important;background:#f8f4ed!important;height:31px!important;min-height:31px!important;padding:0 10px!important;vertical-align:middle!important;border-bottom:1px solid #cfc6b8!important;font-size:10px!important;letter-spacing:.55px!important;text-transform:uppercase!important}
      .canonical-stock-screen .stock-sheet th:nth-child(1),.canonical-stock-screen .stock-sheet td:nth-child(1){width:28%!important}
      .canonical-stock-screen .stock-sheet th:nth-child(2),.canonical-stock-screen .stock-sheet td:nth-child(2){width:25%!important}
      .canonical-stock-screen .stock-sheet th:nth-child(3),.canonical-stock-screen .stock-sheet td:nth-child(3){width:17%!important;text-align:center!important}
      .canonical-stock-screen .stock-sheet th:nth-child(4),.canonical-stock-screen .stock-sheet td:nth-child(4){width:30%!important}
      .canonical-stock-screen .stock-sheet td{padding:7px 10px!important;height:42px!important;box-sizing:border-box!important;vertical-align:middle!important}
      .canonical-stock-screen .stock-sheet .matrix-stock{width:92px!important;min-height:32px!important;height:32px!important;padding:4px 7px!important;margin:0 auto!important;display:block!important}

      .canonical-home{display:grid!important;grid-template-rows:auto auto minmax(0,1fr)!important;gap:10px!important;height:calc(100vh - 34px)!important;min-height:0!important;overflow:hidden!important;padding:16px!important;box-sizing:border-box!important;background:#fbf9f4!important}
      .canonical-home-header{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:16px!important;padding-bottom:9px!important;border-bottom:1px solid #ddd5c9!important}
      .canonical-home-header .eyebrow{font-size:9px!important;letter-spacing:2px!important}.canonical-home-header h2{font:30px/1.02 var(--font-heading)!important;margin:3px 0!important;letter-spacing:-.4px!important}.canonical-home-header p{margin:0!important;font-size:12px!important;color:#66645d!important}.canonical-home-status{font-size:11px!important;white-space:nowrap!important;color:#67685f!important}
      .home-metrics{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;border:1px solid #ddd5c9!important;background:#ddd5c9!important;gap:1px!important}.home-metric{background:#fffdf8!important;padding:9px 12px!important;display:flex!important;align-items:baseline!important;justify-content:space-between!important;gap:8px!important}.home-metric span{font-size:9px!important;letter-spacing:.9px!important;color:#6f6c64!important}.home-metric b{font:24px/1 var(--font-heading)!important;font-weight:400!important}
      .home-grid{display:grid!important;grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr)!important;gap:10px!important;min-height:0!important}.home-panel{border:1px solid #ddd5c9!important;background:#fffdf8!important;padding:12px 14px!important;min-height:0!important;overflow:auto!important}.home-panel-head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;margin-bottom:6px!important}.home-panel h3{font:20px/1.1 var(--font-heading)!important;font-weight:400!important;margin:0!important}.home-panel-head small{font-size:9px!important;color:#777!important}.attention-list{display:grid!important;border-top:1px solid #e2dcd1!important}.attention-row{border-bottom:1px solid #e2dcd1!important;padding:7px 2px!important;display:grid!important;grid-template-columns:30px minmax(0,1fr)!important;align-items:center!important;gap:9px!important}.attention-count{width:27px!important;height:27px!important;display:grid!important;place-items:center!important;border-radius:50%!important;background:#ebe4d8!important;font:14px var(--font-heading)!important}.attention-row.is-ok .attention-count{background:#e4eadf!important}.attention-copy b{display:block!important;font-size:12px!important}.attention-copy small{display:block!important;margin-top:1px!important;font-size:10px!important;color:#777!important}.health-line{display:grid!important;gap:5px!important;margin:10px 0 14px!important}.health-caption{display:flex!important;justify-content:space-between!important;gap:8px!important;font-size:10px!important}.health-track{height:6px!important;background:#ece7dd!important;overflow:hidden!important}.health-track span{display:block!important;height:100%!important;background:#62694f!important}

      .canonical-photo-page{height:calc(100vh - 34px)!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}.canonical-photo-page>.back-link{position:static!important;inset:auto!important;transform:none!important;margin:0 0 3px!important}.canonical-photo-page>.eyebrow{position:static!important;margin:1px 0 2px!important}.canonical-photo-page>h2{position:static!important;font-size:29px!important;line-height:1.05!important;margin:0 0 3px!important}.canonical-photo-page>.admin-help{position:static!important;font-size:11px!important;line-height:1.3!important;margin:0 0 5px!important;max-width:920px!important}.canonical-photo-page>details{margin:0!important;border-top:1px solid #ddd5c9!important}.canonical-photo-page>details>summary{min-height:28px!important;padding:6px 0!important}.canonical-photo-page>.article-photo-filters{margin:3px 0!important;padding:5px 0!important;min-height:38px!important}.canonical-photo-page>.photo-admin-grid{flex:1 1 auto!important;min-height:0!important;overflow:auto!important;margin:0!important;padding-top:4px!important}

      @media(max-width:980px){body:has(#catalogWorkspace.canonical-table-screen),body:has(#catalogWorkspace.canonical-stock-screen),body:has(#catalogWorkspace.canonical-home){overflow:auto!important}.canonical-table-screen,.canonical-stock-screen,.canonical-home{height:auto!important;min-height:calc(100vh - 40px)!important;overflow:visible!important}.canonical-table-screen>.catalog-v2-list,.canonical-stock-screen>.sheet-wrap{max-height:62vh!important}.home-grid{grid-template-columns:1fr!important}.home-metrics{grid-template-columns:repeat(2,1fr)!important}}
    `;document.head.appendChild(st);
  }

  function iconize(btn,kind,title){
    if(!btn)return;btn.classList.add('canonical-icon-btn');btn.dataset.canonicalIcon=kind;
    if(kind==='edit')btn.textContent='✎';else if(kind==='duplicate')btn.textContent='⧉';else if(kind==='trash'){btn.classList.add('is-trash');btn.innerHTML=trash();}else if(kind==='clear')btn.textContent='×';
    btn.title=title;btn.setAttribute('aria-label',title);
  }
  function fieldClass(form,id,cls){const el=$('#'+id,form);const lab=el?.closest('label');if(lab)lab.classList.add(cls);return lab;}
  function forms(root){
    let el=$('#v2pName',root),form=el?.closest('.admin-form');
    if(form){form.classList.add('canonical-admin-form','canonical-product-form');[['v2pName','f-name'],['v2pCategory','f-category'],['v2pPrice','f-price'],['v2pFinishedStock','f-stock'],['v2pOrder','f-order'],['v2pShort','f-short'],['v2pDesc','f-description']].forEach(x=>fieldClass(form,...x));const labels=['v2pFeatured','v2pFragrance','v2pPublished'].map(id=>$('#'+id,form)?.closest('label')).filter(Boolean);if(labels.length){let band=$(':scope>.canonical-checks',form);if(!band){band=document.createElement('div');band.className='canonical-checks';labels[0].before(band);}labels.forEach(l=>{if(l.parentElement!==band)band.appendChild(l);});}}
    el=$('#supName',root);form=el?.closest('.admin-form');if(form){form.classList.add('canonical-admin-form','canonical-supply-form');const g=$$('.catalog-v2-form-grid',form);g[0]?.classList.add('supply-commercial-grid');g[1]?.classList.add('supply-physical-grid');const m={supType:'f-type',supName:'f-supply-name',supUnit:'f-unit',supStock:'f-current-stock',supMin:'f-min-stock',supTarget:'f-target-stock',supPresentation:'f-presentation',supQty:'f-presentation-qty',supCost:'f-last-cost',supSupplier:'f-supplier',supMaterial:'f-material',supColor:'f-color',supCapacity:'f-capacity',supCapacityG:'f-capacity-g',supHeight:'f-height',supWidth:'f-width',supDepth:'f-depth',supDiameter:'f-diameter',supLid:'f-lid',supDesc:'f-description',supNotes:'f-notes'};Object.entries(m).forEach(x=>fieldClass(form,...x));}
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
    $$('.product-supply-row',root).forEach(row=>{if(row.classList.contains('canonical-product-row')||row.classList.contains('canonical-fragrance-row'))return;const rep=$('[data-replace-supply]',row),rem=$('[data-remove]',row);if(!rep&&!rem)return;let box=$(':scope>.canonical-row-actions',row);if(!box){box=document.createElement('div');box.className='canonical-row-actions';row.appendChild(box);}if(rep){box.appendChild(rep);iconize(rep,'edit','Cambiar componente');}if(rem){box.appendChild(rem);iconize(rem,'trash','Quitar componente');}});
  }
  function compactExcel(root){
    $$('button,label',root).forEach(el=>{const t=(el.textContent||'').trim().toLowerCase();if(el.dataset.compactExcel)return;if(t.includes('exportar excel')||t.includes('bajar planilla')){el.dataset.compactExcel='1';el.innerHTML='▦↓ <span>XLSX</span>';el.title='Exportar Excel';}else if(t.includes('importar excel')||t.includes('subir planilla')){const inp=$('input[type=file]',el);el.dataset.compactExcel='1';el.innerHTML='▦↑ <span>XLSX</span>';if(inp)el.appendChild(inp);el.title='Importar Excel';}});
  }

  function activeCatalog(){return document.querySelector('[data-admin-nav].active')?.dataset.adminNav||'';}
  function ensureHead(root,labels,cls){
    const list=$(':scope>.catalog-v2-list',root)||$('.catalog-v2-list',root);if(!list)return null;
    let head=$(':scope>.catalog-v2-head',root)||list.previousElementSibling?.classList?.contains('catalog-v2-head')&&list.previousElementSibling;
    if(!head){head=document.createElement('div');head.className='catalog-v2-head';list.before(head);}
    head.classList.add(cls);head.innerHTML=labels.map(x=>'<span>'+x+'</span>').join('');return head;
  }
  function visibilityControl(id,checked){const l=document.createElement('label');l.className='visibility-control';l.innerHTML='<input type="checkbox" data-visible="'+esc(id)+'" '+(checked?'checked':'')+'><span>Visible</span>';l.title=checked?'Ocultar / inhabilitar':'Mostrar / habilitar';l.setAttribute('aria-label',l.title);return l;}
  function productScreen(root){
    const list=$('#v2ProductList',root);if(!list)return false;
    root.classList.add('canonical-table-screen');ensureHead(root,['Producto','Precio','Stock','Completitud','Acciones'],'canonical-products-head');
    $$('.canonical-product-row',list).forEach(row=>{
      const id=$('[data-v2product]',row)?.dataset.v2product;if(!id)return;
      const item=(window.adminCache?.products||[]).find(x=>String(x.id)===String(id));
      $('.cell-visible',row)?.remove();
      let box=$(':scope>.canonical-row-actions',row);if(!box){box=document.createElement('div');box.className='canonical-row-actions';row.appendChild(box);}
      let vis=$('[data-visible]',row)?.closest('.visibility-control');if(!vis){vis=visibilityControl(id,item?item.published!==false:true);box.prepend(vis);}else if(vis.parentElement!==box)box.prepend(vis);
      [...row.children].filter(x=>x!==box&&x.matches?.('button.icon-edit,button.icon-trash,[data-product-duplicate]')).forEach(x=>box.appendChild(x));
      row.dataset.canonicalProduct='1';
    });return true;
  }
  function categoryScreen(root){
    const list=$('#categoryList',root);if(!list)return false;root.classList.add('canonical-table-screen');const head=$(':scope>.catalog-v2-head',root);head?.classList.add('canonical-categories-head');return true;
  }
  function supplyScreen(root){
    const list=$('#supplyList',root);if(!list)return false;root.classList.add('canonical-table-screen');let head=$(':scope>.supply-v2-head',root);if(head){head.classList.add('canonical-supplies-head');const spans=$$('span',head);if(spans[4])spans[4].textContent='Estado stock';if(spans.length===5){const s=document.createElement('span');s.textContent='Acciones';head.appendChild(s);}}return true;
  }
  function fragranceScreen(root){
    const list=$('#v2FragList',root);if(!list)return false;root.classList.add('canonical-table-screen');ensureHead(root,['Fragancia','Composición','Completitud','Acciones'],'canonical-fragrances-head');
    $$('.catalog-v2-row',list).forEach(row=>{
      row.classList.add('canonical-fragrance-row');const id=$('[data-v2frag]',row)?.dataset.v2frag;if(!id)return;const item=(window.adminCache?.fragrances||[]).find(x=>String(x.id)===String(id));
      const tienda=$('[data-label="Tienda"]',row);let box=$(':scope>.canonical-row-actions',row);if(!box){box=document.createElement('div');box.className='canonical-row-actions';row.appendChild(box);}
      let vis=$('[data-visible]',row)?.closest('.visibility-control');if(!vis){vis=visibilityControl(id,item?item.published!==false:true);box.prepend(vis);}else if(vis.parentElement!==box)box.prepend(vis);
      tienda?.remove();[...row.children].filter(x=>x!==box&&x.matches?.('button.icon-edit,button.icon-trash,[data-fragrance-duplicate]')).forEach(x=>box.appendChild(x));
    });return true;
  }
  function photoPage(root){const grid=$('#photoGrid',root);if(!grid)return false;(grid.closest('.admin-work')||root).classList.add('canonical-photo-page');return true;}

  function polishStock(root){
    const head=$('#gridHead',root),body=$('#stockBody',root),filter=$('#fltProduct',root);if(!head||!body)return false;
    root.classList.add('canonical-stock-screen');$('#stockOverview',root)?.setAttribute('hidden','');const overview=$('#stockOverview',root);if(overview)overview.style.display='none';
    const mode=window.stockMode||'stock';if(mode==='stock'){
      head.innerHTML='<tr><th>Fragancia</th><th>Familia</th><th>Stock</th><th>SKU completo</th></tr>';
      $$('tr[data-na-product]',body).forEach(tr=>{const td=[...tr.children];if(td.length===5){const current=td[2],qty=td[3],input=$('.matrix-stock',qty);if(input&&!input.value)input.value=(current.textContent||'').trim().replace(/[^0-9.-]/g,'')||'0';current.remove();}});
      if(filter){$$('option',filter).forEach(o=>{o.textContent=o.textContent.replace(/\s*·\s*SKU\s*:\s*[^·]+$/i,'').replace(/\s*·\s*SKU\s+[^·]+$/i,'').trim();});if(filter.dataset.canonicalStock!=='1'){filter.dataset.canonicalStock='1';filter.addEventListener('change',()=>setTimeout(()=>polishStock(root),0));}}
      const positive=$('#fltPositive',root);if(positive&&positive.dataset.canonicalStock!=='1'){positive.dataset.canonicalStock='1';positive.addEventListener('change',()=>setTimeout(()=>polishStock(root),0));}
    }
    return true;
  }

  function home(){
    const w=$('#catalogWorkspace');if(!w||w.dataset.canonicalHome)return false;const h=$('h2',w);if(!h||!/catálogo central/i.test(h.textContent||''))return false;
    w.dataset.canonicalHome='ready';w.classList.add('canonical-home');
    w.innerHTML=`<header class="canonical-home-header"><div><span class="eyebrow">INICIO</span><h2>Resumen operativo</h2><p>Lo que requiere atención para mantener la tienda lista para vender y entregar.</p></div><div class="canonical-home-status">Actualizando…</div></header><section class="home-metrics"><div class="home-metric"><span>PRODUCTOS</span><b>—</b></div><div class="home-metric"><span>INSUMOS</span><b>—</b></div><div class="home-metric"><span>FRAGANCIAS</span><b>—</b></div><div class="home-metric"><span>PEDIDOS ACTIVOS</span><b>—</b></div></section><div class="home-grid"><section class="home-panel"><div class="home-panel-head"><h3>Requiere atención</h3><small>Excepciones operativas</small></div><div class="attention-list">${[['Productos para revisar','Datos o configuración pendientes.'],['Productos sin stock','No pueden venderse hasta reponer existencias.'],['Productos sin foto','Necesitan fotografía para estar completos.'],['Productos sin precio','Requieren precio comercial.'],['Insumos bajo mínimo','Control de reposición.'],['Pedidos en circuito','Pago, preparación o entrega pendientes.']].map(([a,b])=>`<div class="attention-row"><span class="attention-count">—</span><span class="attention-copy"><b>${esc(a)}</b><small>${esc(b)}</small></span></div>`).join('')}</div></section><aside class="home-panel"><div class="home-panel-head"><h3>Salud operativa</h3><small>estado actual</small></div><div class="health-line"><div class="health-caption"><span>Catálogo listo para vender</span><b>—</b></div><div class="health-track"><span style="width:0%"></span></div></div><div class="health-line"><div class="health-caption"><span>Insumos sobre mínimo</span><b>—</b></div><div class="health-track"><span style="width:0%"></span></div></div></aside></div>`;return true;
  }

  function apply(){
    injectCss();const root=typeof window.adminShell==='function'?window.adminShell():document;if(!root)return;
    forms(root);componentRows(root);actions(root);compactExcel(root);productScreen(root)||categoryScreen(root)||supplyScreen(root)||fragranceScreen(root)||polishStock(root)||photoPage(root);home();document.documentElement.setAttribute('data-admin-canonical','safe-v2');
  }
  function burst(){[0,70,180].forEach(ms=>setTimeout(()=>{try{apply();}catch(e){console.error('canonical apply',e);}},ms));}
  function wrap(name){const fn=window[name];if(typeof fn!=='function'||fn.__canonicalSafeWrapped)return;const wrapped=async function(...args){const r=await fn.apply(this,args);burst();return r};wrapped.__canonicalSafeWrapped=true;window[name]=wrapped;}
  ['openProducts','openSupplies','openFragrances','openCategories','openVariants','openPhotos','openCatalogHome','v2ProductForm','supplyForm','v2FragranceForm','categoryForm','openProductSupplies'].forEach(wrap);
  document.addEventListener('DOMContentLoaded',burst,{once:true});
  document.addEventListener('click',e=>{if(e.target.closest('button,a,[role=button],summary')){setTimeout(()=>{try{apply();}catch(_){}},90);}},true);
  apply();
})();