# Deploy to Cloudflare Workers

Step-by-step checklist for deploying this TanStack Start app to Cloudflare Workers.

## Prerequisites
- [ ] Free Cloudflare account: https://dash.cloudflare.com/sign-up
- [ ] Node.js + Bun installed locally
- [ ] Project exported to GitHub (Lovable → top-right → GitHub → Connect)

## 1. Clone & install
```bash
git clone <your-repo-url>
cd <repo>
bun install
```

## 2. Install & log in to Wrangler
```bash
bun add -D wrangler
bunx wrangler login
```
Authorize Cloudflare in the browser window that opens.

## 3. Build
```bash
bun run build
```
Produces a Worker bundle with SSR + server functions + `/api/*` routes.

## 4. Add secrets
Run each command and paste the value when prompted. Values for the Supabase ones are in your `.env`.

```bash
bunx wrangler secret put SUPABASE_URL
bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bunx wrangler secret put VITE_SUPABASE_URL
bunx wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
bunx wrangler secret put VITE_SUPABASE_PROJECT_ID
bunx wrangler secret put LOVABLE_API_KEY
```

Grab `LOVABLE_API_KEY` from Lovable Cloud → Secrets, or swap AI calls for your own provider.

If/when you connect Twilio/WhatsApp:
```bash
bunx wrangler secret put TWILIO_API_KEY
bunx wrangler secret put TWILIO_WHATSAPP_FROM
```

## 5. Deploy
```bash
bunx wrangler deploy
```
Wrangler prints a URL like `https://tanstack-start-app.<your-subdomain>.workers.dev`. That's your live site.

## 6. (Optional) Custom domain
Cloudflare dashboard → Workers & Pages → your worker → Settings → Domains & Routes → Add custom domain. DNS + TLS handled automatically if the domain is on Cloudflare.

## Redeploy on every change
```bash
bun run build && bunx wrangler deploy
```
You can keep editing in Lovable (syncs via GitHub) but you redeploy manually — no auto-deploy on this domain.

## What still works
- SSR, all routes, server functions (`createServerFn`)
- Supabase database, auth, RLS (same project)
- Customer name recovery, browser push notifications
- Realtime order updates

## What stays on Supabase
Edge Functions (`parse-voice-order`, `notify-order-ready`, `assistant-chat`) keep running on Supabase. Your Cloudflare frontend calls them at `supabase.co/functions/v1/...` — no action needed.

## Troubleshooting
- **`wrangler login` fails** → try `bunx wrangler login --browser=false` and paste the URL manually.
- **Build fails** → run `bun run build` locally first; fix errors before deploying.
- **500 on deployed site** → check `bunx wrangler tail` for live logs; usually a missing secret.
- **Supabase calls fail** → confirm all 7 secrets are set with `bunx wrangler secret list`.