from __future__ import annotations


def _text(raw: bytes) -> str:
    return raw.decode('utf-8')


def _bytes(s: str) -> bytes:
    return s.encode('utf-8')


def _once(s: str, old: str, new: str, label: str) -> str:
    n = s.count(old)
    if n == 1:
        return s.replace(old, new, 1)
    if n == 0 and new in s:
        return s
    raise RuntimeError(f'final cleanup {label}: expected one occurrence, found {n}')


def _remove_optional_once(s: str, token: str, label: str) -> str:
    n = s.count(token)
    if n > 1:
        raise RuntimeError(f'final cleanup {label}: expected at most one occurrence, found {n}')
    return s.replace(token, '', 1) if n else s


STOCK_STYLE = r'''(function(){
 const q=(s,r=document)=>r.querySelector(s);
 if(q('#finalStockVisualFix'))return;
 const s=document.createElement('style');
 s.id='finalStockVisualFix';
 s.textContent='#catalogWorkspace.canonical-stock-screen>.sheet-filters{display:flex!important;align-items:center!important;gap:14px!important;margin:10px 0 12px!important;padding:0!important;min-height:40px!important;background:transparent!important;border:0!important}#catalogWorkspace.canonical-stock-screen>.sheet-filters label:first-child{display:grid!important;grid-template-columns:auto minmax(340px,600px)!important;align-items:center!important;gap:12px!important;flex:0 1 760px!important;max-width:760px!important;font-size:10px!important;letter-spacing:.7px!important;text-transform:uppercase!important}#catalogWorkspace.canonical-stock-screen>.sheet-filters label:first-child select{width:100%!important;height:40px!important;background:#fffdf8!important;border:1px solid #bdb6aa!important;font-size:14px!important;text-transform:none!important;letter-spacing:0!important}#catalogWorkspace.canonical-stock-screen>.sheet-filters .check{min-height:40px!important;padding:0!important;display:flex!important;align-items:center!important;gap:8px!important}#catalogWorkspace.canonical-stock-screen>.sheet-wrap{border:0!important;background:transparent!important}#catalogWorkspace.canonical-stock-screen .stock-sheet th,#catalogWorkspace.canonical-stock-screen .stock-sheet td{border:0!important;border-bottom:1px solid #ddd5c9!important}#catalogWorkspace.canonical-stock-screen .stock-sheet thead th{background:#fbf9f4!important;color:#68655f!important;font-weight:500!important}#catalogWorkspace.canonical-stock-screen .stock-sheet tbody tr{background:#fffdf8!important}#catalogWorkspace.canonical-stock-screen .stock-sheet td{height:48px!important;padding:8px 12px!important}#catalogWorkspace.canonical-stock-screen .stock-sheet .matrix-stock{width:84px!important;height:32px!important;min-height:32px!important;margin:0 auto!important;text-align:center!important}@media(max-width:900px){#catalogWorkspace.canonical-stock-screen>.sheet-filters{flex-direction:column!important;align-items:stretch!important}#catalogWorkspace.canonical-stock-screen>.sheet-filters label:first-child{grid-template-columns:1fr!important;max-width:none!important;width:100%!important}}';
 document.head.append(s);
})();
'''


COLUMN_ALIGNMENT_CSS = r'''
/* Final Stock / Fragancias column alignment contract. */
#catalogWorkspace.canonical-stock-screen .stock-sheet thead th:nth-child(4){text-align:left!important}
#catalogWorkspace.canonical-table-screen>.catalog-v2-head.canonical-fragrances-head,
#catalogWorkspace.canonical-table-screen>#v2FragList>.catalog-v2-row.canonical-fragrance-row{
  grid-template-columns:minmax(270px,1.35fr) minmax(250px,1fr) 84px 128px!important;
  column-gap:8px!important;
}
'''


def patch_admin(s: str) -> str:
    # Remove obsolete compatibility layer that duplicated row actions.
    style_marker = '<style>/* ADMIN UI CANONICA */'
    script_marker = '<script>(function(){function b(t,h,c,f)'
    start = s.find(style_marker)
    script = s.find(script_marker, start if start >= 0 else 0)
    if start >= 0 and script >= 0:
        end = s.find('</script>', script)
        if end < 0:
            raise RuntimeError('final cleanup admin: legacy script end not found')
        s = s[:start] + s[end + len('</script>'):]
    elif style_marker in s or script_marker in s:
        raise RuntimeError('final cleanup admin: incomplete legacy action layer')

    # Differential Chromium certification proved these two historical modules have
    # no active visual or behavioral participation in any current admin screen.
    # Remove both their CSS and JS requests; active layers remain untouched.
    for token, label in [
        ('<link rel="stylesheet" href="/catalog-layout.css?v=20261003-1">', 'catalog-layout css'),
        ('<link rel="stylesheet" href="/manufacturing.css?v=20261003-1">', 'manufacturing css'),
        ('<script src="/catalog-layout.js?v=20261003-1"></script>', 'catalog-layout js'),
        ('<script src="/manufacturing.js?v=20261003-1"></script>', 'manufacturing js'),
    ]:
        s = _remove_optional_once(s, token, label)

    mobile = '<link rel="stylesheet" href="/mobile-admin.css">'
    if mobile not in s:
        if '</body>' not in s:
            raise RuntimeError('final cleanup admin: body end not found for mobile stylesheet')
        # Placed after admin scripts so responsive rules win over runtime legacy
        # style injection without changing desktop cascade.
        s = s.replace('</body>', mobile + '</body>', 1)
    return s


def patch_dashboard(s: str) -> str:
    # dashboard-data-fix must only update dashboard data. The old second IIFE
    # repeatedly rebuilt Products/Fragrances rows after their source renderers.
    marker = "\n(function(){\n const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)],T=()=>typeof trashIcon==='function'?trashIcon():'🗑';\n function clean(r)"
    i = s.find(marker)
    if i >= 0:
        return s[:i] + '\n' + STOCK_STYLE
    if 'function clean(r)' not in s and "id='finalStockVisualFix'" in s:
        return s
    raise RuntimeError('final cleanup dashboard: legacy row-rebuilder block not found')


def patch_categories(s: str) -> str:
    old_head = "<span>Alertas</span><span>Tienda</span><span>Acciones</span>"
    new_head = "<span>Alertas</span><span>Acciones</span>"
    s = _once(s, old_head, new_head, 'category header')

    old_rows = """      '<label class=\"visibility-control\" data-label=\"Tienda\"><input type=\"checkbox\" data-catvisible=\"'+c.id+'\" '+(c.published!==false?'checked':'')+'><span>Mostrar</span></label>'+\n      '<div class=\"catalog-v2-row-actions\"><button class=\"icon-edit\" data-catedit=\"'+c.id+'\" title=\"Editar\" aria-label=\"Editar\">✎</button><button class=\"icon-trash\" data-cattrash=\"'+c.id+'\" data-name=\"'+ae(c.name)+'\" title=\"Eliminar\" aria-label=\"Eliminar\">'+trashIcon()+'</button></div></article>'"""
    new_rows = """      '<div class=\"catalog-v2-row-actions canonical-row-actions\"><label class=\"visibility-control\" title=\"'+(c.published!==false?'Ocultar / inhabilitar':'Mostrar / habilitar')+'\"><input type=\"checkbox\" data-catvisible=\"'+c.id+'\" '+(c.published!==false?'checked':'')+'><span>Visible</span></label><button class=\"icon-edit\" data-catedit=\"'+c.id+'\" title=\"Editar\" aria-label=\"Editar\">✎</button><button class=\"icon-trash\" data-cattrash=\"'+c.id+'\" data-name=\"'+ae(c.name)+'\" title=\"Eliminar\" aria-label=\"Eliminar\">'+trashIcon()+'</button></div></article>'"""
    s = _once(s, old_rows, new_rows, 'category actions')

    old_component = "<span data-label=\"Contenido en\">'+ae(l.content_container?.purchase_name||'—')+'</span><button class=\"text-link\" data-remove=\"'+l.id+'\">Quitar</button></article>"
    new_component = "<span data-label=\"Contenido en\">'+ae(l.content_container?.purchase_name||'—')+'</span><button type=\"button\" class=\"text-link\" data-replace-supply=\"'+l.id+'\">Cambiar</button><button type=\"button\" class=\"text-link\" data-remove=\"'+l.id+'\">Quitar</button></article>"
    s = _once(s, old_component, new_component, 'component replace action')
    return s


def patch_canonical_runtime(s: str) -> str:
    old_grid = ".canonical-categories-head,#categoryList>.catalog-v2-row{grid-template-columns:minmax(230px,1.4fr) 82px 82px 88px 92px 78px 76px 98px!important;column-gap:10px!important}"
    new_grid = ".canonical-categories-head,#categoryList>.catalog-v2-row{grid-template-columns:minmax(230px,1.4fr) 82px 82px 88px 92px 78px minmax(145px,max-content)!important;column-gap:10px!important}"
    s = _once(s, old_grid, new_grid, 'category grid')
    old_sel = "#categoryList>.catalog-v2-row>span,#categoryList>.catalog-v2-row>.category-alert-count,#categoryList>.catalog-v2-row>.visibility-control{justify-self:center!important;text-align:center!important}"
    new_sel = "#categoryList>.catalog-v2-row>span,#categoryList>.catalog-v2-row>.category-alert-count{justify-self:center!important;text-align:center!important}"
    s = _once(s, old_sel, new_sel, 'category centered cells')
    old_act = "#categoryList>.catalog-v2-row>.catalog-v2-row-actions{justify-self:end!important}"
    new_act = "#categoryList>.catalog-v2-row>.catalog-v2-row-actions{grid-column:7!important;justify-self:end!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;white-space:nowrap!important}"
    s = _once(s, old_act, new_act, 'category actions layout')
    return s


def patch_canonical_css(s: str) -> str:
    # Product catalog rows intentionally reuse product-supply-row for historical
    # reasons. Keep component-row layout rules away from canonical catalog rows.
    s = s.replace('.product-supply-row{display:grid!important;', '.product-supply-row:not(.canonical-product-row):not(.canonical-fragrance-row){display:grid!important;', 1)
    if 'Final Stock / Fragancias column alignment contract.' not in s:
        s += COLUMN_ALIGNMENT_CSS
    return s


def patch_product_duplicate(s: str) -> str:
    # Product rows and component rows now render their controls at source. Remove
    # the document-wide DOM decoration observer and its two redundant decorators.
    start = s.find('  function decorateV2Products(){')
    end = s.find("  document.addEventListener('click',e=>{", start if start >= 0 else 0)
    if start >= 0 and end >= 0:
        s = s[:start] + s[end:]
    elif start >= 0 or 'function decorateComponentRows(){' in s:
        raise RuntimeError('final cleanup product duplicate: incomplete decorator block')
    observer = "\n  new MutationObserver(()=>queueMicrotask(()=>{decorateV2Products();decorateComponentRows()})).observe(document.documentElement,{childList:true,subtree:true});\n  queueMicrotask(()=>{decorateV2Products();decorateComponentRows()});"
    return _remove_optional_once(s, observer, 'product duplicate observer')


def patch_catalog_utilities(s: str) -> str:
    # Filter controls already reapply on their own input/change events and on
    # visibility changes. The list MutationObserver duplicated that work.
    observer = "    new MutationObserver(()=>queueMicrotask(applyFilters)).observe(root.querySelector('.catalog-v2-list')||root,{childList:true,subtree:true});\n"
    return _remove_optional_once(s, observer, 'catalog utility observer')


def patch_admin_tools(s: str) -> str:
    # The admin navigation is static in admin.html and is already bound on
    # DOMContentLoaded. The document-wide hidden-attribute observer only repeated
    # the same binding after login and had no unique behavior.
    obsolete = "new MutationObserver(()=>{if(!adminApp.hidden)bindAdminTools()}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden']});\n"
    return _remove_optional_once(s, obsolete, 'admin-tools nav observer')


def apply(route: str, raw: bytes) -> bytes:
    s = _text(raw)
    if route == '/admin':
        s = patch_admin(s)
    elif route == '/dashboard-data-fix.js':
        s = patch_dashboard(s)
    elif route == '/admin-tools.js':
        s = patch_admin_tools(s)
    elif route == '/product-duplicate-fixes.js':
        s = patch_product_duplicate(s)
    elif route == '/catalog-admin-v2-utilities.js':
        s = patch_catalog_utilities(s)
    elif route == '/catalog-admin-v2.js':
        s = patch_categories(s)
    elif route == '/canonical-admin-ui.js':
        s = patch_canonical_runtime(s)
    elif route == '/canonical-admin-ui.css':
        s = patch_canonical_css(s)
    return _bytes(s)
