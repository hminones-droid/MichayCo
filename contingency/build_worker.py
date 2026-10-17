from pathlib import Path
import base64, hashlib, json, subprocess
from inheritance_patches import apply as apply_inheritance

ROOT = Path(__file__).resolve().parent
BASE = "https://dev.michahome.com.ar"
MANIFEST = json.loads((ROOT / "ACTIVE_BASELINE_MANIFEST.json").read_text())
BASELINE = json.loads((ROOT / "ACTIVE_BASELINE.json").read_text())
RELEASE = (ROOT / "RELEASE.txt").read_text().strip()
OVERRIDES = ROOT / "overrides"
RECOVERED_BINARY = {
    "/assets/aroma-moments-minimal.webp": {
        "url": "https://raw.githubusercontent.com/hminones-droid/MichayCo/main/public/assets/aroma-moments-minimal.webp",
        "sha256": "8ff7bd58360892aefec5f66c4e5925ef68a8ad4dbd12fff9a0153af3e6209a16",
    }
}

if BASELINE["target"] != "michayco-dev" or BASELINE["production_locked"] is not True:
    raise SystemExit("unsafe baseline")
if not RELEASE or not all(c.isalnum() or c in "._-" for c in RELEASE):
    raise SystemExit("invalid release")

def fetch(route):
    p = subprocess.run(["curl", "-fsS", "-A", "Mozilla/5.0", BASE + route], capture_output=True)
    if p.returncode:
        raise SystemExit(f"fetch failed {route}: {p.stderr.decode(errors='ignore')}")
    return p.stdout

def fetch_url(url):
    p = subprocess.run(["curl", "-fsSL", "-A", "Mozilla/5.0", url], capture_output=True)
    if p.returncode:
        raise SystemExit(f"fetch failed {url}: {p.stderr.decode(errors='ignore')}")
    return p.stdout

def override_path(route):
    if route == "/": return OVERRIDES / "index.html"
    if route == "/admin": return OVERRIDES / "admin.html"
    if route == "/oauth/consent": return OVERRIDES / "oauth-consent.html"
    return OVERRIDES / route.lstrip("/")

def content_for(route, expected, apply_text_patch=True):
    remote = fetch(route)
    got = hashlib.sha256(remote).hexdigest()
    if got != expected:
        raise SystemExit(f"active DEV drifted: {route} {got} != {expected}")
    op = override_path(route)
    raw = op.read_bytes() if op.exists() else remote
    return apply_inheritance(route, raw) if apply_text_patch else raw

text = {}
admin = store = consent = None
for route, expected in MANIFEST["text_files"].items():
    raw = content_for(route, expected, True)
    value = raw.decode("utf-8")
    if route == "/admin": admin = value
    elif route == "/": store = value
    elif route == "/oauth/consent": consent = value
    else: text[route] = {"data": value, "binary": False}

extra_supply_fix = OVERRIDES / "supply-form-fixes.js"
if extra_supply_fix.exists():
    text["/supply-form-fixes.js"] = {"data": extra_supply_fix.read_text(), "binary": False}
extra_product_fix = OVERRIDES / "product-duplicate-fixes.js"
if extra_product_fix.exists():
    text["/product-duplicate-fixes.js"] = {"data": extra_product_fix.read_text(), "binary": False}

binary = {}
for route, expected in MANIFEST.get("binary_files", {}).items():
    raw = content_for(route, expected, False)
    binary[route] = {"data": base64.b64encode(raw).decode(), "binary": True}
for route, spec in RECOVERED_BINARY.items():
    raw = fetch_url(spec["url"])
    got = hashlib.sha256(raw).hexdigest()
    if got != spec["sha256"]:
        raise SystemExit(f"recovered asset drifted: {route} {got} != {spec['sha256']}")
    binary[route] = {"data": base64.b64encode(raw).decode(), "binary": True}

if None in (admin, store, consent):
    raise SystemExit("missing required HTML route")
if extra_supply_fix.exists() and "/supply-form-fixes.js" not in admin:
    admin = admin.replace("</body>", '<script src="/supply-form-fixes.js"></script></body>')
if extra_product_fix.exists() and "/product-duplicate-fixes.js" not in admin:
    admin = admin.replace("</body>", '<script src="/product-duplicate-fixes.js"></script></body>')
files = {**text, **binary}

parts = [
    "const HTML=" + json.dumps(admin, ensure_ascii=False, separators=(",", ":")) + ";",
    "const STOREFRONT=" + json.dumps(store, ensure_ascii=False, separators=(",", ":")) + ";",
    "const CONSENT_HTML=" + json.dumps(consent, ensure_ascii=False, separators=(",", ":")) + ";",
    "const FILES=" + json.dumps(files, ensure_ascii=False, separators=(",", ":")) + ";",
    "function mime(p){if(p.endsWith('.js'))return'application/javascript; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.webp'))return'image/webp';if(p.endsWith('.png'))return'image/png';if(p.endsWith('.jpg')||p.endsWith('.jpeg'))return'image/jpeg';if(p.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream'}",
    "function raw(b){const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}",
    "function headers(type){return{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'same-origin'}}",
    "const RELEASE=" + json.dumps(RELEASE) + ";",
    "export default{async fetch(request){const u=new URL(request.url);if(!['dev.michahome.com.ar','michayco-dev.hminones.workers.dev'].includes(u.hostname))return new Response('DEV only',{status:403});if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const head=request.method==='HEAD';if(u.pathname==='/health')return Response.json({ok:true,target:'michayco-dev',release:" + json.dumps(RELEASE) + ",production_locked:true});if(u.pathname==='/oauth/consent'){if(u.hostname!=='dev.michahome.com.ar')return new Response('Use the canonical DEV consent URL',{status:403});return new Response(head?null:CONSENT_HTML,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src https://csabiejhaqmmwmafbdhy.supabase.co; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\"}})}if(u.pathname==='/'||u.pathname==='/admin'||u.pathname==='/admin/'||u.pathname==='/admin.html'){const body=u.pathname==='/'?STOREFRONT:HTML,h=headers('text/html; charset=utf-8');h['x-frame-options']='DENY';h['x-micha-release']=RELEASE;return new Response(head?null:body,{headers:h})}const f=FILES[u.pathname];if(f){const body=f.binary?raw(f.data):f.data;return new Response(head?null:body,{headers:headers(mime(u.pathname))})}return new Response('Not found',{status:404})}};"
]
source = "\n".join(parts) + "\n"
out = ROOT / "worker.js"
out.write_text(source)
sha = hashlib.sha256(source.encode()).hexdigest()
print(json.dumps({"target":"michayco-dev","release":RELEASE,"bytes":len(source.encode()),"sha256":sha,"release_count":source.count(RELEASE)}))
if len(source.encode()) > 2_000_000: raise SystemExit("worker exceeds 2MB contingency limit")
if source.count(RELEASE) != 2: raise SystemExit("release literal count must be 2")
