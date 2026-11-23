# REMOTION VIDEO RUNNER (Cloudflare Worker)

Private API bridge: ChatGPT/client -> Cloudflare Worker -> GitHub Actions -> Remotion MP4.

## 1. GitHub token
Create a fine-grained Personal Access Token restricted to:
- Repository: othermobileapps5-pixel/Remotion
- Actions: Read and write
- Contents: Read-only (the workflow itself uses its own GITHUB_TOKEN to publish output)

Do not commit the token or paste it into chat.

## 2. Deploy
Install Wrangler and authenticate to Cloudflare:
```bash
npm install -g wrangler
wrangler login
cd cloudflare/remotion-runner
wrangler secret put GITHUB_TOKEN
wrangler secret put RUNNER_SECRET
wrangler deploy
```
For GITHUB_TOKEN, paste the fine-grained token into the secure terminal prompt.
For RUNNER_SECRET, generate a long random secret (at least 32 bytes), then save it in your password manager. This is the bearer key used by the caller.

After deploy, note the Worker URL, e.g. https://remotion-video-runner.<account>.workers.dev.

## 3. Test
Replace WORKER_URL and RUNNER_SECRET locally:
```bash
curl -X POST "$WORKER_URL/run" \
  -H "Authorization: Bearer $RUNNER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"video":"maqtanchoq-jimi","format":"shorts","ai_kliplar":false,"google_ai":false}'
```
Then poll:
```bash
curl "$WORKER_URL/status?video=maqtanchoq-jimi" -H "Authorization: Bearer $RUNNER_SECRET"
```
When complete, retrieve:
```bash
curl -L "$WORKER_URL/download?video=maqtanchoq-jimi" -H "Authorization: Bearer $RUNNER_SECRET" -o maqtanchoq-jimi-shorts.mp4
```

## Security notes
- Keep RUNNER_SECRET and GITHUB_TOKEN private.
- Do not enable public CORS origins. The API uses bearer authorization.
- The Worker only accepts safe video IDs and the supported format values.
- This Worker currently exposes authenticated HTTP endpoints; connecting it as a ChatGPT MCP plugin requires a separate MCP server adapter and an authenticated hosting/connection path.
