/* Micha & Co DEV — operational dashboard reads real Supabase data. */
(function(){
  function client(){try{return typeof sb!=='undefined'&&sb?.from?sb:(window.sb?.from?window.sb:null)}catch(_){return window.sb?.from?window.sb:null}}
  const n=v=>Number(v||0);
  function setMetric(label,value){document.querySelectorAll('.home-metric').forEach(el=>{if((el.querySelector('span')?.textContent||'').trim()===label){const b=el.querySelector('b');if(b)b.textContent=String(value)}})}
  function rowByTitle(title){return [...document.querySelectorAll('.attention-row')].find(el=>(el.querySelector('.attention-copy b')?.textContent||'').trim()===title)}
  function setRow(title,value,text){const row=rowByTitle(title);if(!row)return;const c=row.querySelector('.attention-count'),s=row.querySelector('.attention-copy small');if(c)c.textContent=String(value);if(s)s.textContent=text;row.classList.toggle('is-ok',!value)}
  function setHealth(label,pct){document.querySelectorAll('.health-line').forEach(el=>{if((el.querySelector('.health-caption span')?.textContent||'').trim()===label){const b=el.querySelector('.health-caption b'),bar=el.querySelector('.health-track span');if(b)b.textContent=pct+'%';if(bar)bar.style.width=pct+'%'}})}
  async function refresh(){
    const c=client(),home=document.querySelector('.canonical-home');if(!c||!home)return false;
    const [pR,fR,vR,iR,sR,oR]=await Promise.all([
      c.from('products').select('id,name,price,stock,uses_fragrance,published,category_id,material,material_code,color,color_code,capacity_cc,sku'),
      c.from('fragrances').select('id,published'),
      c.from('product_variants').select('id,product_id,stock,published'),
      c.from('product_images').select('id,product_id'),
      c.from('supplies').select('id,stock,min_stock,target_stock,active'),
      c.from('orders').select('id,status')
    ]);
    const results=[pR,fR,vR,iR,sR,oR],bad=results.find(r=>r.error);if(bad)throw bad.error;
    const products=pR.data||[],fragrances=fR.data||[],variants=vR.data||[],images=iR.data||[],supplies=sR.data||[],orders=oR.data||[];
    const stockFor=p=>p.uses_fragrance===false?n(p.stock):variants.filter(v=>String(v.product_id)===String(p.id)).reduce((a,v)=>a+n(v.stock),0);
    const missingFor=p=>{const m=[],parts=String(p.sku||'').split('-'),capacityRequired=(parts[2]||'')!=='000';if(!p.name)m.push('nombre');if(!p.category_id)m.push('categoría');if(!p.material||!p.material_code)m.push('material');if(capacityRequired&&p.capacity_cc==null)m.push('capacidad');if(!p.color||!p.color_code)m.push('color');if(!p.sku||parts.length!==6)m.push('SKU');if(p.price==null)m.push('precio');if(!images.some(i=>String(i.product_id)===String(p.id)))m.push('foto');return m};
    const incomplete=products.filter(p=>missingFor(p).length).length;
    const noPhoto=products.filter(p=>!images.some(i=>String(i.product_id)===String(p.id))).length;
    const noPrice=products.filter(p=>p.price==null).length;
    const noStock=products.filter(p=>stockFor(p)<=0).length;
    const ready=products.filter(p=>p.published!==false&&!missingFor(p).length&&stockFor(p)>0).length;
    const activeSup=supplies.filter(x=>x.active!==false),lowSup=activeSup.filter(x=>x.min_stock!=null&&n(x.stock)<n(x.min_stock)).length,emptySup=activeSup.filter(x=>n(x.stock)<=0).length;
    const activeOrders=orders.filter(o=>!['Entregado','Cancelado'].includes(o.status)).length;
    const pendingOrders=orders.filter(o=>['Pendiente de pago','Pago informado','Pago confirmado','En preparación','Listo para entregar'].includes(o.status)).length;
    const catalogPct=products.length?Math.round(ready/products.length*100):0;
    const withMin=activeSup.filter(x=>x.min_stock!=null),supplyPct=withMin.length?Math.round(withMin.filter(x=>n(x.stock)>=n(x.min_stock)).length/withMin.length*100):100;
    setMetric('PRODUCTOS',products.length);setMetric('INSUMOS',supplies.length);setMetric('FRAGANCIAS',fragrances.length);setMetric('PEDIDOS ACTIVOS',activeOrders);
    setRow('Productos para revisar',incomplete,incomplete?'Tienen datos o configuración pendientes.':'No hay productos incompletos.');
    setRow('Productos sin stock',noStock,noStock?'No pueden venderse hasta reponer existencias.':'Todos los productos configurados tienen stock.');
    setRow('Productos sin foto',noPhoto,noPhoto?'Necesitan fotografía antes de estar completos.':'Cobertura fotográfica completa.');
    setRow('Productos sin precio',noPrice,noPrice?'Requieren precio comercial.':'Todos los productos tienen precio.');
    setRow('Insumos bajo mínimo',lowSup,lowSup?(emptySup+' están sin stock; '+lowSup+' están bajo su mínimo configurado.'):'No hay insumos por debajo del mínimo configurado.');
    setRow('Pedidos en circuito',pendingOrders,pendingOrders?'Tienen pago, preparación o entrega pendientes.':'No hay pedidos pendientes de gestión.');
    setHealth('Catálogo listo para vender',catalogPct);setHealth('Insumos sobre mínimo',supplyPct);
    const total=incomplete+noStock+lowSup+pendingOrders,status=home.querySelector('.canonical-home-status');if(status)status.textContent=total?total+' alertas operativas':'Sin alertas críticas';
    home.dataset.realDashboard='ready';return true;
  }
  let tries=0,t=setInterval(async()=>{try{if(await refresh())clearInterval(t)}catch(e){console.error('dashboard data',e);clearInterval(t)}if(++tries>80)clearInterval(t)},100);
})();

/* Final canonical row normalizer. Bounded post-render cleanup only: no observer, no global event interception. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function currentPublished(kind,id){const list=kind==='product'?(window.adminCache?.products||[]):(window.adminCache?.fragrances||[]);const x=list.find(v=>String(v.id)===String(id));return x?x.published!==false:true}
  function visibility(id,checked){const l=document.createElement('label');l.className='visibility-control canonical-only-visibility';l.title=checked?'Ocultar / inhabilitar':'Mostrar / habilitar';l.setAttribute('aria-label',l.title);l.innerHTML='<input type="checkbox" data-visible="'+esc(id)+'" '+(checked?'checked':'')+'><span>Visible</span>';return l}
  function actionKind(b){const t=((b.title||'')+' '+(b.getAttribute('aria-label')||'')+' '+(b.textContent||'')).toLowerCase();if(b.matches('[data-product-duplicate],[data-fragrance-duplicate],[data-clone]')||t.includes('duplic'))return'duplicate';if(b.matches('.icon-trash,[data-trash],[data-fragrance-trash]')||t.includes('eliminar')||t.includes('borrar')||t.includes('🗑'))return'trash';if(b.matches('.icon-edit')||t.includes('editar'))return'edit';if(t.trim()==='✓'||b.matches('[data-supply-active]'))return'rogue';return''}
  function normalizeRow(row,kind){
    const name=row.querySelector(kind==='product'?'[data-v2product].catalog-v2-name':'[data-v2frag].catalog-v2-name');if(!name)return;
    const id=kind==='product'?name.dataset.v2product:name.dataset.v2frag;
    row.classList.add(kind==='product'?'canonical-product-row':'canonical-fragrance-row');
    if(kind==='product')row.querySelectorAll(':scope>.cell-visible').forEach(x=>x.remove());
    if(kind==='fragrance')row.querySelectorAll(':scope>[data-label="Tienda"]').forEach(x=>x.remove());
    const buttons=[];
    [...row.querySelectorAll(':scope>button,:scope>.catalog-v2-row-actions button,:scope>.canonical-row-actions button')].forEach(b=>{if(b===name)return;const k=actionKind(b);if(k==='rogue'){b.remove();return}if(k&&!buttons.some(x=>x.k===k))buttons.push({k,b});else if(k)b.remove()});
    row.querySelectorAll('.visibility-control').forEach(v=>v.remove());
    row.querySelectorAll(':scope>.catalog-v2-row-actions').forEach(w=>{if(!w.querySelector('button'))w.remove()});
    let box=row.querySelector(':scope>.canonical-row-actions');if(!box){box=document.createElement('div');box.className='canonical-row-actions';row.appendChild(box)}else box.innerHTML='';
    box.appendChild(visibility(id,currentPublished(kind,id)));
    for(const {b} of buttons)box.appendChild(b);
  }
  function normalizeProducts(root){const list=$('#v2ProductList',root);if(!list)return false;$$(':scope>.catalog-v2-row',list).forEach(r=>normalizeRow(r,'product'));return true}
  function normalizeFragrances(root){const list=$('#v2FragList',root);if(!list)return false;$$(':scope>.catalog-v2-row',list).forEach(r=>normalizeRow(r,'fragrance'));return true}
  function normalizeStock(root){const head=$('#gridHead',root),body=$('#stockBody',root);if(!head||!body)return false;if((window.stockMode||'stock')==='stock'){head.innerHTML='<tr><th>Fragancia</th><th>Familia</th><th>Stock</th><th>SKU completo</th></tr>';$$(':scope>tr',body).forEach(tr=>{const cells=[...tr.children];if(cells.length===5){const current=cells[2],qty=cells[3],inp=$('.matrix-stock',qty);if(inp&&!inp.value)inp.value=(current.textContent||'').trim().replace(/[^0-9.-]/g,'')||'0';current.remove()}})}return true}
  function css(){if($('#canonicalFinalTableCss'))return;const s=document.createElement('style');s.id='canonicalFinalTableCss';s.textContent=`
    .canonical-product-row,.canonical-fragrance-row{align-items:center!important}
    .canonical-product-row>[data-label="Completitud"]{grid-column:4!important;justify-self:center!important;position:relative!important;z-index:1!important}
    .canonical-product-row>.canonical-row-actions{grid-column:5!important;position:relative!important;z-index:2!important;min-width:0!important}
    .canonical-fragrance-row>[data-label="Composición"]{grid-column:2!important;align-self:center!important}
    .canonical-fragrance-row>[data-label="Completitud"]{grid-column:3!important;justify-self:center!important}
    .canonical-fragrance-row>.canonical-row-actions{grid-column:4!important;align-self:center!important}
    .canonical-product-row>:not(.catalog-v2-name):not(.cell-money):not(.cell-number):not([data-label="Completitud"]):not(.canonical-row-actions),.canonical-fragrance-row>:not(.catalog-v2-name):not([data-label="Composición"]):not([data-label="Completitud"]):not(.canonical-row-actions){display:none!important}
    .canonical-stock-screen>.sheet-wrap{border:0!important;background:transparent!important}
    .canonical-stock-screen .stock-sheet{display:block!important;width:100%!important;border:0!important;border-collapse:separate!important;border-spacing:0!important;background:transparent!important}
    .canonical-stock-screen .stock-sheet thead,.canonical-stock-screen .stock-sheet tbody{display:block!important;width:100%!important}
    .canonical-stock-screen .stock-sheet thead{position:sticky!important;top:0!important;z-index:8!important;background:#fbf9f4!important}
    .canonical-stock-screen .stock-sheet thead tr,.canonical-stock-screen .stock-sheet tbody tr{display:grid!important;grid-template-columns:minmax(260px,1.15fr) minmax(240px,1fr) 150px minmax(300px,1.2fr)!important;column-gap:14px!important;width:100%!important;box-sizing:border-box!important}
    .canonical-stock-screen .stock-sheet thead tr{height:30px!important;padding:0 10px!important;border-bottom:1px solid #d8d0c4!important;background:#fbf9f4!important}
    .canonical-stock-screen .stock-sheet thead th{position:static!important;width:auto!important;height:30px!important;min-height:30px!important;padding:0!important;border:0!important;background:transparent!important;display:flex!important;align-items:center!important;font-size:10px!important;font-weight:400!important;letter-spacing:.55px!important;text-transform:uppercase!important;color:#68655f!important;text-align:left!important}
    .canonical-stock-screen .stock-sheet thead th:nth-child(3){justify-content:center!important}.canonical-stock-screen .stock-sheet thead th:nth-child(4){justify-content:flex-start!important}
    .canonical-stock-screen .stock-sheet tbody tr{min-height:52px!important;padding:0 10px!important;border-bottom:1px solid #e1d9ce!important;background:#fffdf8!important;align-items:center!important}
    .canonical-stock-screen .stock-sheet tbody td{width:auto!important;height:auto!important;min-height:0!important;padding:6px 0!important;border:0!important;background:transparent!important;display:flex!important;align-items:center!important;min-width:0!important;font-size:12px!important;text-align:left!important}
    .canonical-stock-screen .stock-sheet tbody td:nth-child(3){justify-content:center!important;text-align:center!important}
    .canonical-stock-screen .stock-sheet .matrix-stock{width:88px!important;height:32px!important;min-height:32px!important;margin:0!important;border:1px solid #cfc6b8!important;background:#fff!important;text-align:center!important;border-radius:4px!important}
    .canonical-stock-screen .stock-sheet td small{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  `;document.head.appendChild(s)}
  function apply(){css();const root=typeof window.adminShell==='function'?window.adminShell():document;normalizeProducts(root)||normalizeFragrances(root)||normalizeStock(root)}
  function burst(){[0,80,220].forEach(ms=>setTimeout(()=>{try{apply()}catch(e){console.error('final table normalize',e)}},ms))}
  ['openProducts','openFragrances','openVariants'].forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__finalTableWrapped)return;const w=async function(...a){const r=await fn.apply(this,a);burst();return r};w.__finalTableWrapped=true;window[name]=w});
  document.addEventListener('DOMContentLoaded',burst,{once:true});burst();
})();
