(function(){
  function client(){try{return typeof sb!=='undefined'&&sb?.from?sb:(window.sb?.from?window.sb:null)}catch(_){return window.sb?.from?window.sb:null}}
  const n=v=>Number(v||0);
  function setMetric(label,value){document.querySelectorAll('.home-metric').forEach(el=>{if((el.querySelector('span')?.textContent||'').trim()===label){const b=el.querySelector('b');if(b)b.textContent=String(value)}})}
  function rowByTitle(title){return [...document.querySelectorAll('.attention-row')].find(el=>(el.querySelector('.attention-copy b')?.textContent||'').trim()===title)}
  function setRow(title,value,text){const row=rowByTitle(title);if(!row)return;const c=row.querySelector('.attention-count'),s=row.querySelector('.attention-copy small');if(c)c.textContent=String(value);if(s)s.textContent=text;row.classList.toggle('is-ok',!value)}
  function setHealth(label,pct){document.querySelectorAll('.health-line').forEach(el=>{if((el.querySelector('.health-caption span')?.textContent||'').trim()===label){const b=el.querySelector('.health-caption b'),bar=el.querySelector('.health-track span');if(b)b.textContent=pct+'%';if(bar)bar.style.width=pct+'%'}})}
  async function refresh(){
    const c=client(),home=document.querySelector('.canonical-home');if(!c||!home)return false;
    const [pR,fR,vR,iR,sR,oR]=await Promise.all([c.from('products').select('id,name,price,stock,uses_fragrance,published,category_id,material,material_code,color,color_code,capacity_cc,sku'),c.from('fragrances').select('id,published'),c.from('product_variants').select('id,product_id,stock,published'),c.from('product_images').select('id,product_id'),c.from('supplies').select('id,stock,min_stock,target_stock,active'),c.from('orders').select('id,status')]);
    const bad=[pR,fR,vR,iR,sR,oR].find(r=>r.error);if(bad)throw bad.error;const products=pR.data||[],fragrances=fR.data||[],variants=vR.data||[],images=iR.data||[],supplies=sR.data||[],orders=oR.data||[];
    const stockFor=p=>p.uses_fragrance===false?n(p.stock):variants.filter(v=>String(v.product_id)===String(p.id)).reduce((a,v)=>a+n(v.stock),0);
    const missingFor=p=>{const m=[],parts=String(p.sku||'').split('-'),capacityRequired=(parts[2]||'')!=='000';if(!p.name)m.push('nombre');if(!p.category_id)m.push('categoría');if(!p.material||!p.material_code)m.push('material');if(capacityRequired&&p.capacity_cc==null)m.push('capacidad');if(!p.color||!p.color_code)m.push('color');if(!p.sku||parts.length!==6)m.push('SKU');if(p.price==null)m.push('precio');if(!images.some(i=>String(i.product_id)===String(p.id)))m.push('foto');return m};
    const incomplete=products.filter(p=>missingFor(p).length).length,noPhoto=products.filter(p=>!images.some(i=>String(i.product_id)===String(p.id))).length,noPrice=products.filter(p=>p.price==null).length,noStock=products.filter(p=>stockFor(p)<=0).length,ready=products.filter(p=>p.published!==false&&!missingFor(p).length&&stockFor(p)>0).length;
    const activeSup=supplies.filter(x=>x.active!==false),lowSup=activeSup.filter(x=>x.min_stock!=null&&n(x.stock)<n(x.min_stock)).length,emptySup=activeSup.filter(x=>n(x.stock)<=0).length,activeOrders=orders.filter(o=>!['Entregado','Cancelado'].includes(o.status)).length,pendingOrders=orders.filter(o=>['Pendiente de pago','Pago informado','Pago confirmado','En preparación','Listo para entregar'].includes(o.status)).length;
    const catalogPct=products.length?Math.round(ready/products.length*100):0,withMin=activeSup.filter(x=>x.min_stock!=null),supplyPct=withMin.length?Math.round(withMin.filter(x=>n(x.stock)>=n(x.min_stock)).length/withMin.length*100):100;
    setMetric('PRODUCTOS',products.length);setMetric('INSUMOS',supplies.length);setMetric('FRAGANCIAS',fragrances.length);setMetric('PEDIDOS ACTIVOS',activeOrders);setRow('Productos para revisar',incomplete,incomplete?'Tienen datos o configuración pendientes.':'No hay productos incompletos.');setRow('Productos sin stock',noStock,noStock?'No pueden venderse hasta reponer existencias.':'Todos los productos configurados tienen stock.');setRow('Productos sin foto',noPhoto,noPhoto?'Necesitan fotografía antes de estar completos.':'Cobertura fotográfica completa.');setRow('Productos sin precio',noPrice,noPrice?'Requieren precio comercial.':'Todos los productos tienen precio.');setRow('Insumos bajo mínimo',lowSup,lowSup?(emptySup+' están sin stock; '+lowSup+' están bajo su mínimo configurado.'):'No hay insumos por debajo del mínimo configurado.');setRow('Pedidos en circuito',pendingOrders,pendingOrders?'Tienen pago, preparación o entrega pendientes.':'No hay pedidos pendientes de gestión.');setHealth('Catálogo listo para vender',catalogPct);setHealth('Insumos sobre mínimo',supplyPct);const total=incomplete+noStock+lowSup+pendingOrders,status=home.querySelector('.canonical-home-status');if(status)status.textContent=total?total+' alertas operativas':'Sin alertas críticas';return true;
  }
  let tries=0,t=setInterval(async()=>{try{if(await refresh())clearInterval(t)}catch(e){clearInterval(t)}if(++tries>80)clearInterval(t)},100);
})();

(function(){
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const trash=()=>typeof window.trashIcon==='function'?window.trashIcon():'🗑';

  function removeCompetingActions(row,keep){
    qa('.canonical-row-actions',row).forEach(x=>{if(x!==keep)x.remove()});
    qa('.catalog-v2-row-actions,.product-monitor-actions',row).forEach(x=>{if(!keep.contains(x))x.remove()});
    qa('.visibility-control',row).forEach(x=>{if(!keep.contains(x))x.remove()});
    qa('button',row).forEach(x=>{if(x.classList.contains('catalog-v2-name')||keep.contains(x))return;if(x.matches('[data-v2product],[data-v2frag],[data-product-duplicate],[data-product-delete],[data-fragrance-delete],.icon-edit,.icon-trash'))x.remove()});
  }

  function normalizeProducts(){
    const list=q('#v2ProductList');if(!list)return false;
    qa(':scope>.catalog-v2-row',list).forEach(row=>{
      const name=q('.catalog-v2-name[data-v2product]',row);if(!name)return;const id=name.dataset.v2product,item=(window.adminCache?.products||[]).find(x=>String(x.id)===String(id)),visible=!item||item.published!==false;
      let box=q(':scope>.canonical-row-actions',row);if(!box){box=document.createElement('div');box.className='canonical-row-actions';row.appendChild(box)}
      removeCompetingActions(row,box);
      box.innerHTML='<label class="visibility-control" title="'+(visible?'Ocultar / inhabilitar':'Mostrar / habilitar')+'"><input type="checkbox" data-visible="'+esc(id)+'" '+(visible?'checked':'')+'><span>Visible</span></label><button type="button" class="icon-edit canonical-icon-btn" data-final-product-edit="'+esc(id)+'" title="Editar" aria-label="Editar">✎</button><button type="button" class="icon-edit canonical-icon-btn" data-product-duplicate="'+esc(id)+'" title="Duplicar" aria-label="Duplicar">⧉</button><button type="button" class="icon-trash canonical-icon-btn is-trash" data-product-delete="'+esc(id)+'" data-name="'+esc(item?.name||name.textContent.trim())+'" title="Eliminar" aria-label="Eliminar">'+trash()+'</button>';
      q('[data-final-product-edit]',box).onclick=e=>{e.preventDefault();e.stopPropagation();window.v2ProductForm?.(id)};
      row.classList.add('canonical-product-row');
    });return true;
  }

  function normalizeFragrances(){
    const list=q('#v2FragList');if(!list)return false;
    qa(':scope>.catalog-v2-row',list).forEach(row=>{
      const name=q('.catalog-v2-name[data-v2frag]',row);if(!name)return;const id=name.dataset.v2frag,item=(window.adminCache?.fragrances||[]).find(x=>String(x.id)===String(id)),visible=!item||item.published!==false;
      let box=q(':scope>.canonical-row-actions',row);if(!box){box=document.createElement('div');box.className='canonical-row-actions';row.appendChild(box)}
      removeCompetingActions(row,box);
      qa(':scope>[data-label="Tienda"]',row).forEach(x=>x.remove());
      box.innerHTML='<label class="visibility-control" title="'+(visible?'Ocultar / inhabilitar':'Mostrar / habilitar')+'"><input type="checkbox" data-visible="'+esc(id)+'" '+(visible?'checked':'')+'><span>Visible</span></label><button type="button" class="icon-edit canonical-icon-btn" data-final-fragrance-edit="'+esc(id)+'" title="Editar" aria-label="Editar">✎</button><button type="button" class="icon-trash canonical-icon-btn is-trash" data-fragrance-delete="'+esc(id)+'" data-name="'+esc(item?.name||name.textContent.trim())+'" title="Eliminar" aria-label="Eliminar">'+trash()+'</button>';
      q('[data-final-fragrance-edit]',box).onclick=e=>{e.preventDefault();e.stopPropagation();window.v2FragranceForm?.(id)};
      row.classList.add('canonical-fragrance-row');
    });return true;
  }

  function injectStockStyle(){
    if(q('#finalStockVisualFix'))return;const s=document.createElement('style');s.id='finalStockVisualFix';s.textContent=`
      #catalogWorkspace.canonical-stock-screen>.sheet-filters{display:flex!important;align-items:center!important;gap:14px!important;margin:10px 0 12px!important;padding:0!important;min-height:40px!important;background:transparent!important;border:0!important}
      #catalogWorkspace.canonical-stock-screen>.sheet-filters label:first-child{display:grid!important;grid-template-columns:auto minmax(340px,600px)!important;align-items:center!important;gap:12px!important;flex:0 1 760px!important;max-width:760px!important;color:#68655f!important;font-size:10px!important;letter-spacing:.7px!important;text-transform:uppercase!important}
      #catalogWorkspace.canonical-stock-screen>.sheet-filters label:first-child select{width:100%!important;max-width:none!important;height:40px!important;background:#fffdf8!important;border:1px solid #bdb6aa!important;color:#24251f!important;font-size:14px!important;text-transform:none!important;letter-spacing:0!important}
      #catalogWorkspace.canonical-stock-screen>.sheet-filters .check{min-height:40px!important;padding:0!important;display:flex!important;align-items:center!important;gap:8px!important;font-size:12px!important;letter-spacing:.4px!important;text-transform:uppercase!important}
      #catalogWorkspace.canonical-stock-screen>.sheet-wrap{border:0!important;background:transparent!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet{border:0!important;background:transparent!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet th,#catalogWorkspace.canonical-stock-screen .stock-sheet td{border:0!important;border-bottom:1px solid #ddd5c9!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet thead th{background:#fbf9f4!important;color:#68655f!important;font-weight:500!important;text-align:left!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet thead th:nth-child(3){text-align:center!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet tbody tr{background:#fffdf8!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet td{height:48px!important;padding:8px 12px!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet td:first-child b{display:block!important;font-size:13px!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet .cell-sub{display:block!important;margin-top:2px!important;color:#77736b!important;font-size:10px!important}
      #catalogWorkspace.canonical-stock-screen .stock-sheet .matrix-stock{width:84px!important;height:32px!important;min-height:32px!important;margin:0 auto!important;text-align:center!important;border:1px solid #c9c1b4!important;background:#fffdf8!important}
      @media(max-width:900px){#catalogWorkspace.canonical-stock-screen>.sheet-filters{align-items:stretch!important;flex-direction:column!important}#catalogWorkspace.canonical-stock-screen>.sheet-filters label:first-child{grid-template-columns:1fr!important;max-width:none!important;width:100%!important}}
    `;document.head.appendChild(s);
  }

  function normalize(){injectStockStyle();normalizeProducts();normalizeFragrances()}
  function burst(){[0,70,180,400].forEach(ms=>setTimeout(normalize,ms))}
  ['openProducts','openFragrances','openVariants'].forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__finalRowsWrapped)return;const wrapped=async function(...args){const r=await fn.apply(this,args);burst();return r};wrapped.__finalRowsWrapped=true;window[name]=wrapped});
  document.addEventListener('click',e=>{if(e.target.closest('#v2ProductList,#v2FragList'))setTimeout(normalize,120)},true);
  injectStockStyle();burst();
})();
