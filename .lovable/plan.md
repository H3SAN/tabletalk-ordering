## Deploy to Cloudflare Workers

Your project is already configured for Cloudflare Workers (`wrangler.jsonc` exists, build target is set via `@lovable.dev/vite-tanstack-config`). You just need a Cloudflare account and a few CLI steps.

### What you'll need
- A free Cloudflare account (https://dash.cloudflare.com/sign-up)
- The project running locally (cloned from GitHub via Lovable's GitHub integration)
- Node + Bun installed locally

### Step-by-step

**1. Export the project to GitHub**
In Lovable: top-right → GitHub → Connect → Create repository. Then clone it locally:
```
git clone <your-repo-url>
cd <repo>
bun install
```

**2. Install & log in to Wrangler** (Cloudflare's CLI)
```
bun add -D wrangler
bunx wrangler login
```
A browser window opens — authorize Cloudflare.

**3. Build the app**
```
bun run build
```
This produces a Worker bundle that includes SSR + server functions + `/api/*` routes.

**4. Add your secrets to the Worker**
The Worker needs the same env vars that Lovable Cloud injects automatically. Run each of these and paste the value when prompted:
```
bunx wrangler secret put SUPABASE_URL
bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bunx wrangler secret put VITE_SUPABASE_URL
bunx wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
bunx wrangler secret put VITE_SUPABASE_PROJECT_ID
bunx wrangler secret put LOVABLE_API_KEY
```
Values for the Supabase ones are already in your `.env`. `LOVABLE_API_KEY` you'll need to grab from Lovable (Cloud → Secrets) or replace AI calls with your own provider.

**5. Deploy**
```
bunx wrangler deploy
```
Wrangler prints a URL like `https://tanstack-start-app.<your-subdomain>.workers.dev`. That's your live site.

**6. (Optional) Custom domain**
In the Cloudflare dashboard → Workers & Pages → your worker → Settings → Domains & Routes → Add custom domain. Cloudflare handles DNS + TLS automatically if the domain is on Cloudflare.

### What still works
- ✅ SSR, all routes, server functions (`createServerFn`)
- ✅ Supabase database, auth, RLS (same project)
- ✅ Customer name recovery, browser push notifications
- ✅ Realtime order updates

### What needs extra work
- **Supabase Edge Functions** (`parse-voice-order`, `notify-order-ready`, `assistant-chat`): these stay on Supabase's infrastructure, not Cloudflare. They keep working as-is — your Cloudflare-hosted frontend will call them at their `supabase.co/functions/v1/...` URLs. No action needed unless you want to migrate them to TanStack server routes later.
- **Future code changes**: every change requires `bun run build && bunx wrangler deploy`. You lose Lovable's one-click publish on this domain. You can keep using Lovable to *edit* code (it syncs via GitHub) but you redeploy manually.
- **Twilio / WhatsApp secret**: if/when you connect Twilio, add `TWILIO_API_KEY` and `TWILIO_WHATSAPP_FROM` via `wrangler secret put` too.

### Trade-off vs Lovable Publish
| | Lovable Publish | Cloudflare Workers |
|---|---|---|
| Setup time | 0 min | ~15 min |
| Auto-deploy on edit | ✅ | ❌ (manual `wrangler deploy`) |
| Custom domain | ✅ | ✅ |
| Cost | Included | Free tier: 100k requests/day |
| Edge performance | Good | Excellent (300+ POPs) |
| Control over infra | Low | Full |

### Recommendation
Unless you specifically need Cloudflare (edge performance, custom Workers logic, existing CF account/billing), **Lovable Publish is simpler** — same underlying tech, zero ops. Cloudflare makes sense if you want full infra control or are migrating off Lovable later.

Want me to proceed with anything specific — e.g. prep a deployment checklist file in the repo, or just stick with Lovable Publish?
