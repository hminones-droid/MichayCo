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
