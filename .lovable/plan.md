
# Finish & stabilize: identified orders + recovery + notifications

## Goal
Stop losing customer orders when they close the page. Every order is tied to a name + WhatsApp number. The customer can re-open the QR menu, type their name, and see all their active orders for that table. When staff marks an order ready, the customer is alerted three ways: in-page, browser push, and WhatsApp.

---

## 1. How "name-based recovery" actually works

A name alone is not unique ("John" twice in one café). The QR token already scopes a customer to a single **table at a single branch**, so we use:

> **`name` + `qr_token` (table) + recent window (last 4 hours)**

Flow:
- At checkout, we **require** name + WhatsApp number before placing the order. Both saved on the order row.
- We also keep the existing `customer_session_id` in `localStorage` (so on the same device they get instant access — no re-typing).
- If they switch device / clear storage / reopen later: the QR landing page (`/t/$qrToken`) shows a **"Find my orders"** button → modal asks for name → returns every order on this table from the last 4 hours matching that name (case-insensitive). One tap takes them to the existing tracking page.
- WhatsApp number is also accepted as recovery key (more unique than name) — either field works.

This keeps it frictionless (no login, no SMS code) while making orders recoverable across sessions on the same table.

## 2. Database changes

Add to `orders`:
- `customer_name text` (required, 1–80 chars, validated)
- `customer_whatsapp text` (required, E.164 format, validated)
- Index on `(branch_id, table_id, lower(customer_name), created_at)` for recovery lookups.

Update RLS / `anyone insert orders` check to require both fields are non-empty.

New RPC `find_my_orders(_qr_token, _query)` — security definer, returns orders from the last 4 hours on that table where name OR whatsapp matches, with status + order_number.

## 3. Checkout UI changes

In `src/routes/t.$qrToken.tsx` cart/place-order step:
- Add two required inputs above the "Place order" button: **Your name**, **WhatsApp number** (with country code helper).
- Validate with zod (name 1–80, whatsapp E.164 regex).
- Persist name + whatsapp in `localStorage` per QR token so they don't re-type for follow-up orders.

## 4. Recovery UI

On `/t/$qrToken` (menu page header):
- If no active orders detected from `localStorage`, show subtle "Already ordered? Find my orders" link.
- Opens a sheet with one input ("name or WhatsApp number"), calls `find_my_orders` RPC, lists results with order number, status badge, and an "Open" button → tracking page.

## 5. Notifications when order is ready

Three layers, all triggered by the existing status transition to `ready`:

**a. In-page (already done)** — vibration + audio beep on the tracking page. Keep as-is.

**b. Browser push notifications** (new)
- On the tracking page, prompt for `Notification.requestPermission()` once after order is placed.
- Subscribe to a Supabase realtime channel (already wired). When status flips to `ready`, fire `new Notification("Your order #123 is ready!", { body: ..., vibrate: [...] })`.
- Pure client-side, no service worker needed for the foreground/background-tab case. Works on Android Chrome, desktop. iOS Safari requires PWA install — we'll show a small "Add to home screen for alerts" hint on iOS.

**c. WhatsApp message** (new — uses Twilio connector)
- A new server function `notifyOrderReady` is called by a database trigger (or by the kitchen UI's status update mutation) when status → `ready`.
- It looks up `customer_whatsapp` and sends a WhatsApp template message via Twilio's `/Messages.json` endpoint (`From: whatsapp:+...`, `To: whatsapp:+<number>`, body: "Hi {name}, your order #{n} at {restaurant} is ready! 🍽️").
- Requires the **Twilio connector** to be connected (uses connector gateway — no API key in code). User needs a Twilio WhatsApp sender (sandbox is fine for testing; production needs an approved sender).

## 6. "Reach out to staff"
Already exists — `Need help?` button on the tracking page inserts into `service_requests`. We'll surface the same button more prominently on the order list/recovery results, and add a "Call waiter" affordance on the menu page once an active order exists.

---

## Technical changes (for reference)

- **Migration**: alter `orders` (add columns + check constraints + index), update insert RLS, add `find_my_orders` RPC, add trigger `notify_on_ready` that calls a tiny pg_net HTTP call OR (simpler) have the kitchen UI call a server fn after the status update succeeds.
- **Server fn** `src/lib/notifications.functions.ts`: `notifyOrderReady({ orderId })` — uses `supabaseAdmin` to read order + restaurant name, then calls Twilio gateway with `URLSearchParams`.
- **Kitchen UI** (`src/routes/dashboard.kitchen.tsx`): after `advance(o)` updates status to `ready`, fire-and-forget `notifyOrderReady({ orderId: o.id })`.
- **Customer pages**:
  - `t.$qrToken.tsx`: add name/whatsapp form + zod validation + recovery sheet.
  - `t.$qrToken.order.$orderId.tsx`: add `Notification.requestPermission()` and `new Notification(...)` on status=ready.
- **Connector**: trigger `standard_connectors--connect` for **Twilio** before the WhatsApp piece works. Need to surface a clear message to the user: connect Twilio + provide WhatsApp sender number as a secret (`TWILIO_WHATSAPP_FROM`).

## Order of work
1. Migration: add columns, RPC, RLS update.
2. Checkout form: required name + WhatsApp.
3. Recovery sheet on QR menu page.
4. Browser push notification on tracking page.
5. Connect Twilio + add `TWILIO_WHATSAPP_FROM` secret.
6. `notifyOrderReady` server fn + wire into kitchen status change.
7. Test end-to-end.

## What I need from you before starting step 5
- Confirm you want me to walk you through connecting **Twilio** (free trial works for testing). We'll need: Twilio account, a WhatsApp-enabled sender number (sandbox is `+14155238886`).
- For testing without Twilio you'll still get in-page + browser push notifications immediately after step 4.
