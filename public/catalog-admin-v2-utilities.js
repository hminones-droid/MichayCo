/* Micha & Co — shared V2 catalog utilities */
(function(){
  function exportRows(filename,rows){
    if(!window.XLSX){alert('No se pudo cargar el exportador de Excel.');return}
    const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Catálogo');XLSX.writeFile(wb,filename);
  }
  function addTools(root,{hideLabel='Ocultar no visibles',onToggle,onExport}){
    const bar=root.querySelector('.catalog-v2-controls')||root.querySelector('.catalog-v2-toolbar');if(!bar)return;
    const box=document.createElement('div');box.className='catalog-v2-actions catalog-v2-shared-tools';
    if(onToggle){const label=document.createElement('label');label.className='check';label.innerHTML='<input type="checkbox" data-v2-hide> '+hideLabel;label.querySelector('input').onchange=e=>onToggle(e.target.checked);box.appendChild(label)}
    if(onExport){const b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent='Exportar Excel';b.onclick=onExport;box.appendChild(b)}
    bar.appendChild(box);
  }
  const originalProducts=window.openProducts;
  window.openProducts=async function(){
    await originalProducts();const root=adminShell();let hide=false;
    const redraw=()=>root.querySelectorAll('#v2ProductList .catalog-v2-row').forEach(row=>{const visible=[...row.querySelectorAll('[data-label="Tienda"]')].some(x=>x.textContent.trim()==='Visible');row.hidden=hide&&!visible});
    addTools(root,{onToggle:v=>{hide=v;redraw()},onExport:()=>exportRows('michaco-productos.xlsx',(adminCache.products||[]).map(p=>({Producto:p.name,Categoria:p.category?.name||'',Precio:p.price??'',Stock_terminado:p.stock??0,Visible:p.published!==false?'Sí':'No'}))});redraw();
  };
  const originalSupplies=window.openSupplies;
  window.openSupplies=async function(){
    await originalSupplies();const root=adminShell();let hide=false;
    const redraw=()=>root.querySelectorAll('#supplyList .catalog-v2-row').forEach(row=>{const active=[...row.querySelectorAll('[data-label="Catálogo"]')].some(x=>x.textContent.trim()==='Activo');row.hidden=hide&&!active});
    addTools(root,{onToggle:v=>{hide=v;redraw()},onExport:async()=>{const {data,error}=await sb.from('supplies').select('*').order('type').order('purchase_name');if(error)return alert(error.message);exportRows('michaco-insumos.xlsx',(data||[]).map(x=>({Codigo:x.code,Insumo:x.purchase_name,Tipo:x.type,Unidad:x.stock_unit,Stock:x.stock??0,Stock_minimo:x.min_stock??'',Stock_objetivo:x.target_stock??'',Proveedor:x.supplier??'',Activo:x.active?'Sí':'No'})))}});redraw();
  };
  const originalFragrances=window.openFragrances;
  if(originalFragrances)window.openFragrances=async function(){
    await originalFragrances();const root=adminShell();
    addTools(root,{onExport:async()=>{const {data,error}=await sb.from('fragrances').select('*').order('name');if(error)return alert(error.message);exportRows('michaco-fragancias.xlsx',(data||[]).map(x=>({Fragancia:x.name,Visible:x.published!==false?'Sí':'No',Descripcion:x.description??''})))}});
  };
})();