# Deployment

End-to-end deploy on Cloudflare Pages with a single Pages Function calling Anthropic. Free-tier compatible. Updated 2026-04-30.

## Prerequisites

You already have:
- Cloudflare account
- Anthropic API key
- Domain `ismyaialive.com` (registrar TBD)
- GitHub account

If the GitHub repo isn't yet pushed, do that first (`gh repo create --private justinstimatze/ismyaialive`).

---

## Step 1 — Local dev setup

```bash
# In project root
cp .dev.vars.example .dev.vars
# Edit .dev.vars: paste real ANTHROPIC_API_KEY, generate IP_HASH_SECRET via:
openssl rand -hex 32
# DAILY_BUDGET_USD can stay at 5.00 for dev

# Test the Worker locally
npx wrangler pages dev . --kv RATE_LIMIT
```

This serves static files + the function at `http://localhost:8788`. Hit it:

```bash
curl -X POST http://localhost:8788/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"transcript":"You said:\nhey can you help me with pi\n\nChatGPT said:\nSure!\n\nYou said:\nam i going crazy if pi means something\n\nChatGPT said:\nAbsolutely not — you'\''re so perceptive."}' | jq
```

Expected: a JSON response with `parse`, `crisis`, `findings`, `summary`. The first call also writes the system prompt to Anthropic's cache; subsequent calls within ~5min cost ~10% as much.

## Step 2 — Cloudflare Pages project

Two options.

**Option A — connect to GitHub (auto-deploy on push):**
1. CF dashboard → Pages → "Create a project" → "Connect to Git"
2. Select the `ismyaialive` repo, branch `main`
3. Build settings: Framework preset = "None"; Build command = (blank); Build output directory = `/`
4. Environment variables: leave blank for now (we'll set them in Step 4)
5. Save and Deploy

**Option B — direct upload (no Git):**
```bash
npx wrangler pages deploy . --project-name=ismyaialive
```
First run prompts to create the project.

I'd recommend Option A — auto-deploy on `main` push is easier than remembering to run wrangler.

## Step 3 — KV namespace

```bash
npx wrangler kv namespace create RATE_LIMIT
```

Output looks like:
```
🌀 Creating namespace with title "ismyaialive-RATE_LIMIT"
✨ Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "abc123def456..."
```

Replace `REPLACE_WITH_KV_ID_FROM_CLOUDFLARE_DASHBOARD` in `wrangler.toml` with that real ID. Commit and push.

In CF dashboard: Pages → ismyaialive project → Settings → Functions → KV namespace bindings → add a binding named `RATE_LIMIT` pointing at the namespace you just created. (Required even though `wrangler.toml` declares it — Pages reads its own bindings.)

## Step 4 — Secrets and env vars

In CF dashboard: Pages → ismyaialive project → Settings → Environment variables:

**Production environment, encrypted:**
- `ANTHROPIC_API_KEY` = your key
- `IP_HASH_SECRET` = `openssl rand -hex 32` output (different from local one)

**Production environment, plaintext:**
- `DAILY_BUDGET_USD` = `5.00` (start conservative; tune up after you see real traffic)

Repeat for `Preview` environment if you want preview deploys to also work end-to-end. For dev, use `.dev.vars` locally.

CLI alternative (encrypted secrets only):
```bash
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=ismyaialive
npx wrangler pages secret put IP_HASH_SECRET --project-name=ismyaialive
```

## Step 5 — Domain

1. CF dashboard → main account → "Add a Site" → enter `ismyaialive.com`
2. Choose Free plan
3. CF gives you two nameservers — go to your registrar (Namecheap / Squarespace Domains / etc.) and replace the existing nameservers with these. Propagation: minutes to hours.
4. Once CF shows "Active" for the zone, go back to Pages → ismyaialive → Custom domains → "Set up a custom domain" → `ismyaialive.com` and `www.ismyaialive.com`. CF auto-creates the necessary DNS records.
5. SSL is automatic (Universal SSL).

DDoS protection and caching are on by default once the orange-cloud proxy is enabled (it is by default for the Pages-managed records).

## Step 6 — First production deploy + smoke test

If using Option A (Git): push to `main` triggers a build. Watch the Pages dashboard → Deployments tab.

If using Option B: `npx wrangler pages deploy . --project-name=ismyaialive`.

Once deployed:
```bash
curl -X POST https://ismyaialive.com/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"transcript":"...same body as local test..."}' | jq
```

Verify in CF dashboard → Pages → Functions → Real-time logs that requests are landing.

## Step 7 — Monitoring + budget hygiene

**Anthropic side:**
- Console.anthropic.com → Settings → Limits → set a daily/monthly hard cap. Belt and braces with our `DAILY_BUDGET_USD` kill-switch.
- Watch the Workbench for the first dozen real calls; verify prompt-cache hits (look for `cache_read_input_tokens` in usage).

**Cloudflare side:**
- Workers & Pages → Analytics: request counts, error rates, p95 latency.
- KV: Pages → Storage & Databases → KV → click your namespace → see live keys for rate-limit and budget tracking.
- For real-time tail logs: `npx wrangler pages deployment tail --project-name=ismyaialive`.

**Budget reset:**
The `budget:YYYY-MM-DD` KV key has a 25-hour TTL, so it auto-rolls over each UTC midnight. If you ever want to manually reset (e.g., a transient bug spent the budget): delete the key in the dashboard.

## Costs at a glance

- **Cloudflare Pages:** free for static + functions up to 100,000 requests/day per zone.
- **Cloudflare KV:** free for 100,000 reads/day, 1,000 writes/day (each analysis writes 4–5 keys; budgets to ~200 analyses/day on free tier).
- **Anthropic Haiku 4.5 with prompt caching:** ~$0.005–$0.02 per analysis. At `DAILY_BUDGET_USD=5.00` that's roughly 250–1000 analyses/day before the kill-switch fires.
- **Domain:** whatever your registrar charges (~$10/year for a `.com`).

## Troubleshooting

- **`wrangler pages dev` errors with "no bindings"**: the local `--kv RATE_LIMIT` flag creates a local KV; if you skip it, the Worker treats KV-absent as "no rate limiting" and proceeds (intentional for tests).
- **`401 Unauthorized` from Anthropic**: API key wrong or revoked. Check by hitting `https://api.anthropic.com/v1/messages` with curl directly.
- **`exhausted` budget but you haven't run anything**: a previous test exhausted the dev `DAILY_BUDGET_USD`; either bump it or wait 24h.
- **CORS errors in browser**: Worker checks `Origin` header against `ALLOWED_ORIGINS` in `functions/api/analyze.js`. If you change domains, update that array and redeploy.
- **No prompt-cache hits**: Anthropic caches require the system prompt to be byte-identical across calls and within ~5min of the previous call. Check that nothing in `system-prompt.js` is interpolating dynamic data.

## Things I did NOT set up automatically

- `wrangler.toml` has a placeholder KV ID. You must replace it after Step 3.
- Pages project doesn't exist yet on CF. You must create it (Step 2).
- Domain isn't pointed at CF yet. You must change nameservers (Step 5).
- No GitHub repo push yet (if not done already).

These are all things only you can do because they require account credentials I don't have.
