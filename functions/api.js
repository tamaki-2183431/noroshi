// functions/api.js — /api へのリクエストを GAS Web アプリ（env.GAS_URL）へ中継する
// 旧デプロイと同じ応答（GET: {"ok":true,"service":"noroshi-api-proxy","upstream":"configured"}）を返す
const TIMEOUT_MS = 25000;

function json(body, status) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestGet() {
  return json({ ok: true, service: "noroshi-api-proxy", upstream: "configured" });
}

export async function onRequestPost({ request, env }) {
  const upstream = env.GAS_URL;
  if (!upstream) {
    return json({ ok: false, code: "E_CONFIG", message: "サーバー設定が不足しています。" }, 500);
  }
  const body = await request.text();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      redirect: "follow",
      signal: ctrl.signal,
    });
    const text = await res.text();
    return json(text, res.status);
  } catch (e) {
    return json({ ok: false, code: "E_UPSTREAM", message: "サーバーに接続できませんでした。" }, 502);
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "GET, POST, OPTIONS" } });
  }
  return json({ ok: false, code: "E_METHOD", message: "許可されていないメソッドです。" }, 405);
}
