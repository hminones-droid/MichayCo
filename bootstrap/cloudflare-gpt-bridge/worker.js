// Temporary bootstrap bridge for Micha&Co Cloudflare administration.
// This is NOT the storefront runtime and must not contain Cloudflare API tokens.
// Authentication secret is configured only in Cloudflare after deployment.

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "michaco-gpt-cloudflare-bridge", mode: "bootstrap" });
    }

    if (request.method !== "POST" || url.pathname !== "/v1/command") {
      return json({ ok: false, error: "not_found" }, 404);
    }

    const supplied = request.headers.get("x-michaco-bridge-key") || "";
    const expectedHash = env.BRIDGE_KEY_SHA256 || "";
    if (!expectedHash || !timingSafeEqualHex(await sha256Hex(supplied), expectedHash)) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

    // Bootstrap version is intentionally read-only. Mutation is enabled only after
    // authentication and audit flow are validated from ChatGPT against DEV.
    if (body?.action === "capabilities") {
      return json({ ok: true, capabilities: ["health", "capabilities"], mutation: false });
    }

    return json({ ok: false, error: "mutation_locked" }, 409);
  }
};
