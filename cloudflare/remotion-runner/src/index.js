const GH = "https://api.github.com";
const OWNER = "othermobileapps5-pixel";
const REPO = "Remotion";
const WORKFLOW = "video-yasash.yml";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) ? origin : "null";
  return {
    "access-control-allow-origin": ok,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "vary": "Origin",
  };
}
async function gh(path, env, init = {}) {
  return fetch(GH + path, {
    ...init,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "remotion-video-runner",
      ...(init.headers || {}),
    },
  });
}
function authorized(req, env) {
  const got = req.headers.get("authorization") || "";
  return !!env.RUNNER_SECRET && got === `Bearer ${env.RUNNER_SECRET}`;
}
export default {
  async fetch(req, env) {
    const origin = req.headers.get("origin") || "";
    const cors = corsHeaders(origin, env);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!authorized(req, env)) return json({ error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    try {
      if (req.method === "POST" && url.pathname === "/run") {
        const body = await req.json();
        const video = String(body.video || "").trim();
        const format = String(body.format || "shorts");
        if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(video)) return json({ error: "Invalid video id" }, 400);
        if (!["youtube", "shorts", "ikkalasi"].includes(format)) return json({ error: "Invalid format" }, 400);
        const res = await gh(`/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, env, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ref: "main", inputs: {
            video, format, ai_kliplar: String(body.ai_kliplar === true),
            max_klip: "10", telegram: "", avto_yuklash: "false", tg_fayl: "",
            google_ai: String(body.google_ai === true),
          }}),
        });
        if (res.status !== 204) return json({ error: "GitHub dispatch failed", status: res.status, detail: await res.text() }, 502);
        return json({ accepted: true, video, format, message: "Workflow queued. Check /status?video=" + encodeURIComponent(video) }, 202);
      }
      if (req.method === "GET" && url.pathname === "/status") {
        const video = url.searchParams.get("video") || "";
        const res = await gh(`/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=20`, env);
        if (!res.ok) return json({ error: "Cannot read workflow runs", status: res.status }, 502);
        const data = await res.json();
        const run = (data.workflow_runs || []).find(r => {
          const inputs = r.inputs || {};
          return !video || inputs.video === video || (r.display_title || "").includes(video);
        });
        if (!run) return json({ found: false, message: "No matching workflow run found yet" }, 404);
        return json({ found: true, id: run.id, status: run.status, conclusion: run.conclusion, html_url: run.html_url, created_at: run.created_at, updated_at: run.updated_at });
      }
      if (req.method === "GET" && url.pathname === "/download") {
        const video = url.searchParams.get("video") || "";
        const res = await gh(`/repos/${OWNER}/${REPO}/releases/tags/videolar`, env);
        if (!res.ok) return json({ error: "Release not available", status: res.status }, 404);
        const release = await res.json();
        const asset = (release.assets || []).find(a => a.name === `${video}-shorts.mp4` || a.name === `${video}.mp4`);
        if (!asset) return json({ error: "MP4 asset not found", available: (release.assets || []).map(a => a.name) }, 404);
        const file = await fetch(asset.url, { headers: {
          "accept": "application/octet-stream",
          "authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "remotion-video-runner",
        }});
        if (!file.ok) return json({ error: "MP4 download failed", status: file.status }, 502);
        return new Response(file.body, { headers: {
          "content-type": "video/mp4",
          "content-disposition": `attachment; filename="${asset.name}"`,
          "cache-control": "no-store",
        }});
      }
      return json({ service: "REMOTION VIDEO RUNNER", endpoints: ["POST /run", "GET /status?video=...", "GET /download?video=..."] });
    } catch (e) {
      return json({ error: "Internal error", detail: String(e?.message || e) }, 500);
    }
  },
};