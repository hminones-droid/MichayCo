// Micha&Co Cloudflare administration bridge.
// DEV control plane only. No Cloudflare API token belongs in source control.
const DEV_WORKER = "michayco-dev";
const CF_API = "https://api.cloudflare.com/client/v4";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authenticated(request, env) {
  const supplied = request.headers.get("x-michaco-bridge-key") || "";
  const expectedHash = env.BRIDGE_KEY_SHA256 || "";
  if (!expectedHash) return false;
  return safeEqual(await sha256Hex(supplied), expectedHash);
}

async function cf(env, path, init = {}) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    throw new Error("cloudflare_configuration_missing");
  }
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${env.CLOUDFLARE_API_TOKEN}`);
  return fetch(`${CF_API}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}${path}`, {
    ...init,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "michaco-gpt-cloudflare-bridge",
        mode: "control-plane",
        target: DEV_WORKER,
        production_locked: true,
      });
    }

    if (request.method !== "POST" || url.pathname !== "/v1/command") {
      return json({ ok: false, error: "not_found" }, 404);
    }

    if (!(await authenticated(request, env))) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }

    const action = body?.action;

    if (action === "capabilities") {
      return json({
        ok: true,
        target: DEV_WORKER,
        capabilities: [
          "health",
          "capabilities",
          "status_dev",
          "read_dev",
          "verify_dev",
          "deploy_dev",
        ],
        production_locked: true,
      });
    }

    if (action === "status_dev") {
      try {
        const response = await cf(
          env,
          `/workers/scripts/${encodeURIComponent(DEV_WORKER)}/subdomain`
        );
        const result = await response.json();
        return json(
          {
            ok: response.ok,
            target: DEV_WORKER,
            production_locked: true,
            cloudflare: result,
          },
          response.ok ? 200 : 502
        );
      } catch (error) {
        return json(
          {
            ok: false,
            error: String(error?.message || error),
            target: DEV_WORKER,
            production_locked: true,
          },
          502
        );
      }
    }

    if (action === "read_dev") {
      try {
        const response = await cf(
          env,
          `/workers/scripts/${encodeURIComponent(DEV_WORKER)}`
        );
        if (!response.ok) {
          const detail = await response.text();
          return json(
            {
              ok: false,
              error: "cloudflare_read_failed",
              target: DEV_WORKER,
              http_status: response.status,
              detail: detail.slice(0, 2000),
              production_locked: true,
            },
            502
          );
        }
        const script = await response.text();
        if (!script || script.length > 500000) {
          return json(
            {
              ok: false,
              error: "invalid_worker_source",
              target: DEV_WORKER,
              production_locked: true,
            },
            502
          );
        }
        return json({
          ok: true,
          target: DEV_WORKER,
          script,
          sha256: await sha256Hex(script),
          bytes: new TextEncoder().encode(script).byteLength,
          production_locked: true,
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: String(error?.message || error),
            target: DEV_WORKER,
            production_locked: true,
          },
          502
        );
      }
    }

    if (action === "verify_dev") {
      try {
        const response = await fetch("https://michayco-dev.hminones.workers.dev/", {
          method: "GET",
          redirect: "follow",
        });
        return json({
          ok: response.ok,
          target: DEV_WORKER,
          http_status: response.status,
          production_locked: true,
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: String(error?.message || error),
            target: DEV_WORKER,
            production_locked: true,
          },
          502
        );
      }
    }

    if (action === "deploy_dev") {
      const script = body?.script;
      if (typeof script !== "string" || !script.trim()) {
        return json({ ok: false, error: "invalid_script", target: DEV_WORKER }, 400);
      }
      if (script.length > 500000) {
        return json({ ok: false, error: "script_too_large", target: DEV_WORKER }, 413);
      }
      try {
        const metadata = {
          main_module: "worker.js",
          compatibility_date: "2026-10-04",
        };
        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append(
          "worker.js",
          new Blob([script], { type: "application/javascript+module" }),
          "worker.js"
        );
        const response = await cf(
          env,
          `/workers/scripts/${encodeURIComponent(DEV_WORKER)}`,
          { method: "PUT", body: form }
        );
        const result = await response.json();
        return json(
          {
            ok: response.ok,
            target: DEV_WORKER,
            production_locked: true,
            cloudflare: result,
          },
          response.ok ? 200 : 502
        );
      } catch (error) {
        return json(
          {
            ok: false,
            error: String(error?.message || error),
            target: DEV_WORKER,
            production_locked: true,
          },
          502
        );
      }
    }

    if (
      action === "deploy_production" ||
      action === "status_production" ||
      action === "read_production" ||
      action === "delete_worker"
    ) {
      return json({ ok: false, error: "production_locked" }, 409);
    }

    return json({ ok: false, error: "unsupported_action" }, 400);
  },
};
